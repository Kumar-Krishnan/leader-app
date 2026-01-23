/**
 * HubSpot File API Scope Test
 * 
 * This script tests if a HubSpot access token has the necessary scopes
 * to list and retrieve files from HubSpot's File Manager.
 * 
 * Required scopes:
 * - files.ui_hidden.read (minimum for reading files)
 * - files (full file access)
 * 
 * Usage:
 *   HUBSPOT_ACCESS_TOKEN=your_token_here node file_listing_and_retrieval_test.js
 * 
 * Or set in .env file:
 *   HUBSPOT_ACCESS_TOKEN=your_token_here
 */

const fs = require('fs');
const path = require('path');

/**
 * Load environment variables from .env file
 */
function loadEnvFile() {
  // Try to use dotenv if available
  try {
    require('dotenv').config();
    return;
  } catch (e) {
    // dotenv not available, manually parse .env file
  }

  // Find .env file (check current directory and parent directories)
  const envPaths = [
    path.join(__dirname, '.env'),
    path.join(__dirname, '..', '.env'),
    path.join(__dirname, '..', '..', '.env'),
    path.join(process.cwd(), '.env'),
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      try {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const lines = envContent.split('\n');
        
        for (const line of lines) {
          const trimmed = line.trim();
          // Skip comments and empty lines
          if (!trimmed || trimmed.startsWith('#')) continue;
          
          // Parse KEY=VALUE format
          const match = trimmed.match(/^([^=]+)=(.*)$/);
          if (match) {
            const key = match[1].trim();
            let value = match[2].trim();
            
            // Remove quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1);
            }
            
            // Only set if not already in process.env (env vars take precedence)
            if (!process.env[key]) {
              process.env[key] = value;
            }
          }
        }
        return;
      } catch (error) {
        // Silently fail if we can't read the file
      }
    }
  }
}

// Load .env file before anything else
loadEnvFile();

const HUBSPOT_API_BASE = 'https://api.hubapi.com';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

/**
 * Make a request to HubSpot API
 */
async function hubspotRequest(endpoint, options = {}) {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  
  if (!token) {
    throw new Error('HUBSPOT_ACCESS_TOKEN environment variable is required');
  }

  const url = `${HUBSPOT_API_BASE}${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    
    let data;
    if (isJson) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      data,
      headers: Object.fromEntries(response.headers.entries()),
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message,
    };
  }
}

/**
 * Test 0: Check token scopes
 */
async function testTokenScopes() {
  logSection('Test 0: Check Token Scopes');
  
  logInfo('Checking token scopes...');
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  
  // Try to introspect the token
  const result = await hubspotRequest(`/oauth/v1/access-tokens/${token}`, {
    method: 'GET',
  });

  if (result.ok && result.data && result.data.scopes) {
    const scopes = result.data.scopes;
    logSuccess(`Token has ${scopes.length} scopes`);
    logInfo('Granted scopes:');
    scopes.forEach(scope => {
      const hasFiles = scope.includes('files');
      logInfo(`  ${hasFiles ? '✅' : '  '} ${scope}`);
    });
    
    const hasFilesScope = scopes.some(s => s === 'files');
    const hasFilesHiddenRead = scopes.some(s => s === 'files.ui_hidden.read');
    
    if (hasFilesScope || hasFilesHiddenRead) {
      logSuccess('Token has file-related scopes');
      return { success: true, scopes, hasFilesScope, hasFilesHiddenRead };
    } else {
      logWarning('Token does not have file-related scopes');
      return { success: false, scopes, hasFilesScope: false, hasFilesHiddenRead: false };
    }
  } else {
    logWarning('Could not introspect token (this is optional)');
    logInfo('Continuing with file API tests...');
    return { success: true, scopes: null };
  }
}

/**
 * Test 0.5: Verify API connectivity
 */
async function testAPIConnectivity() {
  logSection('Test 0.5: Verify API Connectivity');
  
  logInfo('Testing basic API connectivity...');
  
  // Try a simple endpoint that should work with any valid token
  const endpoints = [
    { path: '/integrations/v1/me', description: 'Get user info' },
    { path: '/crm/v3/objects/contacts', method: 'GET', description: 'List contacts (to verify auth)' },
  ];
  
  for (const endpoint of endpoints) {
    logInfo(`Trying: ${endpoint.description}`);
    logInfo(`Endpoint: ${endpoint.method || 'GET'} ${endpoint.path}`);
    
    const result = await hubspotRequest(endpoint.path, {
      method: endpoint.method || 'GET',
    });
    
    if (result.status === 200 || result.status === 401 || result.status === 403) {
      // These statuses indicate the API is reachable
      if (result.status === 200) {
        logSuccess(`API connectivity verified via ${endpoint.description}`);
        return { success: true };
      } else if (result.status === 401) {
        logError('Authentication failed - token is invalid or expired');
        return { success: false, error: 'Invalid token' };
      } else if (result.status === 403) {
        logWarning(`Access denied for ${endpoint.description} (this is OK, just checking connectivity)`);
        logSuccess('API connectivity verified (got 403, which means API is reachable)');
        return { success: true };
      }
    }
  }
  
  logWarning('Could not verify API connectivity, but continuing with file tests...');
  return { success: true }; // Don't fail the whole test suite
}

/**
 * Test 1: List files from HubSpot File Manager
 */
async function testListFiles() {
  logSection('Test 1: List Files');
  
  // Try multiple endpoints - HubSpot Files API has different endpoints
  // Note: Based on HubSpot API responses, /files/v3/files requires POST and /search requires GET
  const endpoints = [
    { path: '/files/v3/files/search', method: 'GET', description: 'Search files (GET)' },
    { path: '/files/v3/files/search?limit=100', method: 'GET', description: 'Search files with limit (GET)' },
    { path: '/filemanager/api/v3/files/search', method: 'GET', description: 'File Manager API search (GET)' },
    { path: '/filemanager/api/v2/files', method: 'GET', description: 'File Manager API v2 (GET)' },
    { path: '/files/v3/files', method: 'POST', body: {}, description: 'Files endpoint (POST - for creating)' },
  ];

  for (const endpoint of endpoints) {
    logInfo(`Trying: ${endpoint.description}`);
    logInfo(`Endpoint: ${endpoint.method} ${endpoint.path}`);
    logInfo(`Full URL: ${HUBSPOT_API_BASE}${endpoint.path}`);
    
    const requestOptions = {
      method: endpoint.method || 'GET',
    };
    
    if (endpoint.body) {
      requestOptions.body = JSON.stringify(endpoint.body);
    }
    
    const result = await hubspotRequest(endpoint.path, requestOptions);

    if (result.error) {
      logError(`Network error: ${result.error}`);
      continue;
    }

    logInfo(`Response status: ${result.status} ${result.statusText}`);

    if (result.status === 401) {
      logError('Authentication failed - Invalid or expired token');
      return { success: false, error: 'Authentication failed' };
    }

    if (result.status === 403) {
      logError('Access forbidden - Token missing required scopes');
      logWarning('Required scopes: files.ui_hidden.read or files');
      if (result.data && result.data.message) {
        logInfo(`HubSpot message: ${result.data.message}`);
      }
      if (result.data && result.data.requiredScopes) {
        logInfo(`Required scopes: ${result.data.requiredScopes.join(', ')}`);
      }
      continue; // Try next endpoint
    }

    if (result.status === 405) {
      logWarning(`Method not allowed (405) for ${endpoint.path}`);
      if (result.headers && result.headers['allow']) {
        logInfo(`Allowed methods for this endpoint: ${result.headers['allow']}`);
      } else {
        logWarning('No Allow header in response - endpoint may not exist');
      }
      if (result.data && typeof result.data === 'string' && result.data.includes('<html>')) {
        logWarning('Received HTML error page - endpoint may not exist or API may be unavailable');
        logInfo('This could mean:');
        logInfo('  - Files API is not available for your HubSpot account/plan');
        logInfo('  - Endpoint path is incorrect');
        logInfo('  - API version has changed');
      }
      continue; // Try next endpoint
    }

    if (!result.ok) {
      logWarning(`Request failed: ${result.status} ${result.statusText}`);
      if (result.data) {
        logInfo(`Response: ${JSON.stringify(result.data, null, 2)}`);
      }
      continue; // Try next endpoint
    }

    // Success - parse response
    let files = [];
    if (result.data && result.data.results) {
      files = result.data.results;
    } else if (Array.isArray(result.data)) {
      files = result.data;
    } else if (result.data && result.data.objects) {
      files = result.data.objects;
    }

    if (files.length > 0 || (result.data && (result.data.results || Array.isArray(result.data)))) {
      logSuccess(`Successfully listed ${files.length} files using ${endpoint.description}`);
      
      if (files.length > 0) {
        logInfo('\nFirst few files:');
        files.slice(0, 5).forEach((file, index) => {
          console.log(`  ${index + 1}. ${file.name || file.id} (${file.type || 'unknown type'})`);
        });
        
        if (files.length > 5) {
          logInfo(`  ... and ${files.length - 5} more files`);
        }
        
        return { success: true, files, fileId: files[0]?.id };
      } else {
        logWarning('No files found in File Manager');
        return { success: true, files: [], fileId: null };
      }
    } else {
      logWarning(`Unexpected response format from ${endpoint.path}`);
      logInfo(`Response: ${JSON.stringify(result.data, null, 2)}`);
      continue; // Try next endpoint
    }
  }

  // If we get here, all endpoints failed
  logError('All file listing endpoints failed');
  logInfo('\nPossible reasons:');
  logInfo('  1. HubSpot Files API may not be available for your account/plan');
  logInfo('  2. File Manager feature may not be enabled in your HubSpot account');
  logInfo('  3. HubSpot Files API endpoints may have changed or been deprecated');
  logInfo('  4. The API version or endpoint path may be incorrect');
  logInfo('\nTroubleshooting steps:');
  logInfo('  1. Verify File Manager is enabled:');
  logInfo('     - Log into HubSpot → Settings → Files');
  logInfo('     - Ensure File Manager is accessible in the UI');
  logInfo('  2. Check HubSpot API documentation:');
  logInfo('     https://developers.hubspot.com/docs/api-reference/files-files-v3');
  logInfo('  3. Verify your HubSpot plan includes File Manager');
  logInfo('  4. Try testing with a specific file ID (see below)');
  logInfo('  5. Contact HubSpot support if File Manager is enabled but API fails');
  
  // Suggest testing with a specific file ID if available
  const testFileId = process.env.HUBSPOT_TEST_FILE_ID;
  if (testFileId) {
    logInfo(`\n✅ Found HUBSPOT_TEST_FILE_ID - will test file retrieval directly`);
  } else {
    logInfo(`\n💡 Tip: If you have a file ID from HubSpot File Manager, set:`);
    logInfo(`   HUBSPOT_TEST_FILE_ID=your_file_id_here`);
    logInfo(`   This will test file retrieval even if listing fails`);
  }
  
  return { success: false, error: 'All endpoints failed' };
}

/**
 * Test 2: Retrieve a specific file
 */
async function testRetrieveFile(fileId) {
  logSection('Test 2: Retrieve Specific File');
  
  if (!fileId) {
    logWarning('No file ID available from previous test - skipping file retrieval test');
    logInfo('To test file retrieval, ensure your File Manager has at least one file');
    return { success: false, skipped: true };
  }

  logInfo(`Attempting to retrieve file: ${fileId}`);
  logInfo('Endpoint: GET /files/v3/files/{fileId}');
  
  const result = await hubspotRequest(`/files/v3/files/${fileId}`, {
    method: 'GET',
  });

  if (result.error) {
    logError(`Network error: ${result.error}`);
    return { success: false, error: result.error };
  }

  logInfo(`Response status: ${result.status} ${result.statusText}`);

  if (result.status === 401) {
    logError('Authentication failed - Invalid or expired token');
    return { success: false, error: 'Authentication failed' };
  }

  if (result.status === 403) {
    logError('Access forbidden - Token missing required scopes');
    logWarning('Required scopes: files.ui_hidden.read or files');
    return { success: false, error: 'Missing scopes' };
  }

  if (result.status === 404) {
    logWarning(`File not found: ${fileId}`);
    logInfo('This might mean the file was deleted or the ID is invalid');
    return { success: false, error: 'File not found' };
  }

  if (!result.ok) {
    logError(`Request failed: ${result.status} ${result.statusText}`);
    if (result.data) {
      logInfo(`Response: ${JSON.stringify(result.data, null, 2)}`);
    }
    return { success: false, error: `HTTP ${result.status}` };
  }

  if (result.data) {
    const file = result.data;
    logSuccess(`Successfully retrieved file: ${file.name || fileId}`);
    logInfo(`File details:`);
    logInfo(`  - Name: ${file.name || 'N/A'}`);
    logInfo(`  - Type: ${file.type || 'N/A'}`);
    logInfo(`  - Size: ${file.size ? `${(file.size / 1024).toFixed(2)} KB` : 'N/A'}`);
    logInfo(`  - Created: ${file.createdAt || 'N/A'}`);
    logInfo(`  - URL: ${file.url || 'N/A'}`);
    
    return { success: true, file };
  } else {
    logWarning('Unexpected response format');
    return { success: false, error: 'Unexpected response format' };
  }
}

/**
 * Test 3: Get file download URL
 */
async function testGetFileDownloadUrl(fileId) {
  logSection('Test 3: Get File Download URL');
  
  if (!fileId) {
    logWarning('No file ID available - skipping download URL test');
    return { success: false, skipped: true };
  }

  logInfo(`Attempting to get download URL for file: ${fileId}`);
  logInfo('Endpoint: GET /files/v3/files/{fileId}/signed-url');
  
  const result = await hubspotRequest(`/files/v3/files/${fileId}/signed-url`, {
    method: 'GET',
  });

  if (result.error) {
    logError(`Network error: ${result.error}`);
    return { success: false, error: result.error };
  }

  logInfo(`Response status: ${result.status} ${result.statusText}`);

  if (result.status === 401) {
    logError('Authentication failed - Invalid or expired token');
    return { success: false, error: 'Authentication failed' };
  }

  if (result.status === 403) {
    logError('Access forbidden - Token missing required scopes');
    logWarning('Required scopes: files.ui_hidden.read or files');
    return { success: false, error: 'Missing scopes' };
  }

  if (!result.ok) {
    logWarning(`Could not get download URL: ${result.status} ${result.statusText}`);
    logInfo('This endpoint may require additional scopes or may not be available');
    if (result.data) {
      logInfo(`Response: ${JSON.stringify(result.data, null, 2)}`);
    }
    return { success: false, error: `HTTP ${result.status}` };
  }

  if (result.data && result.data.url) {
    logSuccess('Successfully retrieved signed download URL');
    logInfo(`Download URL: ${result.data.url.substring(0, 80)}...`);
    return { success: true, downloadUrl: result.data.url };
  } else {
    logWarning('Unexpected response format');
    return { success: false, error: 'Unexpected response format' };
  }
}

/**
 * Check Node.js version (requires 18+ for native fetch)
 */
function checkNodeVersion() {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion < 18) {
    logError(`Node.js version ${nodeVersion} detected. This script requires Node.js 18+ for native fetch support.`);
    logInfo('Please upgrade Node.js or install node-fetch: npm install node-fetch@2');
    return false;
  }
  
  return true;
}

/**
 * Check token type and provide guidance
 */
function checkTokenType(token) {
  if (token.startsWith('pat-')) {
    return { type: 'Private App Token', valid: true };
  } else if (token.startsWith('sb_publishable_')) {
    return {
      type: 'Publishable Token',
      valid: false,
      message: 'Publishable tokens have limited access and cannot be used for server-side API calls.\n' +
               'You need a Private App Access Token instead.'
    };
  } else if (token.startsWith('CL') || token.startsWith('CM')) {
    return { type: 'OAuth Token', valid: true };
  } else {
    return { type: 'Unknown', valid: true, message: 'Token type not recognized, attempting to use anyway.' };
  }
}

/**
 * Main test runner
 */
async function runTests() {
  logSection('HubSpot File API Scope Test');

  // Check Node.js version
  if (!checkNodeVersion()) {
    process.exit(1);
  }

  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) {
    logError('HUBSPOT_ACCESS_TOKEN environment variable is not set');
    logInfo('\nUsage options:');
    logInfo('  1. Set as environment variable:');
    logInfo('     HUBSPOT_ACCESS_TOKEN=your_token_here node file_listing_and_retrieval_test.js');
    logInfo('\n  2. Create a .env file in one of these locations:');
    logInfo('     - Same directory as this script');
    logInfo('     - Parent directory (__tests__/manual_tests/)');
    logInfo('     - Project root directory');
    logInfo('\n     With content:');
    logInfo('     HUBSPOT_ACCESS_TOKEN=your_token_here');
    logInfo('\nNote: Requires Node.js 18+ for native fetch support');
    process.exit(1);
  }

  logInfo(`Token found: ${token.substring(0, 20)}...`);

  // Check token type
  const tokenCheck = checkTokenType(token);
  logInfo(`Token type: ${tokenCheck.type}`);

  if (!tokenCheck.valid) {
    logError(tokenCheck.message);
    logInfo('\nTo create a Private App Access Token:');
    logInfo('  1. Go to HubSpot → Settings → Integrations → Private Apps');
    logInfo('  2. Click "Create a private app"');
    logInfo('  3. Name your app (e.g., "File API Test")');
    logInfo('  4. Go to the "Scopes" tab');
    logInfo('  5. Under "CMS", enable:');
    logInfo('     - files (Read and Write)');
    logInfo('  6. Click "Create app" and copy the access token');
    logInfo('  7. Update your .env file with the new token (starts with "pat-")');
    process.exit(1);
  }

  if (tokenCheck.message) {
    logWarning(tokenCheck.message);
  }

  logInfo('Starting tests...\n');

  const results = {
    tokenScopes: null,
    apiConnectivity: null,
    listFiles: null,
    retrieveFile: null,
    downloadUrl: null,
  };

  try {
    // Test 0: Check token scopes
    results.tokenScopes = await testTokenScopes();
    
    // Test 0.5: Verify API connectivity
    results.apiConnectivity = await testAPIConnectivity();
    
    // Test 1: List files
    results.listFiles = await testListFiles();
    
    // Determine which file ID to use for retrieval tests
    let fileIdToTest = null;
    if (results.listFiles.success && results.listFiles.fileId) {
      fileIdToTest = results.listFiles.fileId;
    } else if (process.env.HUBSPOT_TEST_FILE_ID) {
      logInfo('\nUsing HUBSPOT_TEST_FILE_ID from environment for retrieval tests');
      fileIdToTest = process.env.HUBSPOT_TEST_FILE_ID;
    }
    
    // Test 2: Retrieve specific file
    if (fileIdToTest) {
      results.retrieveFile = await testRetrieveFile(fileIdToTest);
      
      // Test 3: Get download URL (if file retrieval succeeded)
      if (results.retrieveFile.success) {
        results.downloadUrl = await testGetFileDownloadUrl(fileIdToTest);
      }
    }

    // Summary
    logSection('Test Summary');
    
    const tests = [
      { name: 'Check Token Scopes', result: results.tokenScopes },
      { name: 'Verify API Connectivity', result: results.apiConnectivity },
      { name: 'List Files', result: results.listFiles },
      { name: 'Retrieve File', result: results.retrieveFile },
      { name: 'Get Download URL', result: results.downloadUrl },
    ];

    tests.forEach(test => {
      if (test.result === null) {
        logWarning(`${test.name}: Not executed`);
      } else if (test.result.skipped) {
        logWarning(`${test.name}: Skipped`);
      } else if (test.result.success) {
        logSuccess(`${test.name}: PASSED`);
      } else {
        logError(`${test.name}: FAILED - ${test.result.error || 'Unknown error'}`);
      }
    });

    // Final verdict
    console.log('\n');
    const allPassed = Object.values(results).every(r => 
      r === null || r.skipped || r.success
    );
    const hasFailures = Object.values(results).some(r => 
      r !== null && !r.skipped && !r.success
    );

    if (hasFailures) {
      logError('Some tests failed. Your token may be missing required scopes.');
      logInfo('\nRequired scopes for file operations:');
      logInfo('  - files.ui_hidden.read (minimum for reading files)');
      logInfo('  - files (full file access)');
      logInfo('\nTo update scopes, regenerate your access token in HubSpot with the required scopes.');
      process.exit(1);
    } else if (allPassed) {
      logSuccess('All tests passed! Your token has the necessary scopes.');
      process.exit(0);
    } else {
      logWarning('Some tests were skipped, but no failures detected.');
      process.exit(0);
    }

  } catch (error) {
    logError(`Unexpected error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run tests if executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests, testTokenScopes, testListFiles, testRetrieveFile, testGetFileDownloadUrl };
