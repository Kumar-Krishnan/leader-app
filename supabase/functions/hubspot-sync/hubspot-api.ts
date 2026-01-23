/**
 * HubSpot File Manager API client
 */

export interface HubSpotFile {
  id: string;
  name: string;
  size: number;
  url: string;
  type: string;
  extension: string;
  createdAt: string;
  updatedAt: string;
  parentFolderId?: string;
}

export interface HubSpotFilesResponse {
  results: HubSpotFile[];
  paging?: {
    next?: {
      after: string;
      link: string;
    };
  };
}

export class HubSpotClient {
  private accessToken: string;
  private baseUrl = 'https://api.hubapi.com';

  constructor(accessToken: string) {
    if (!accessToken) {
      throw new Error('HubSpot access token is required');
    }
    this.accessToken = accessToken;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HubSpot API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Search for files in HubSpot File Manager
   * Uses pagination to fetch all files
   */
  async searchFiles(options: {
    limit?: number;
    after?: string;
  } = {}): Promise<HubSpotFilesResponse> {
    const params = new URLSearchParams();
    params.set('limit', String(options.limit || 100));
    if (options.after) {
      params.set('after', options.after);
    }

    return this.request<HubSpotFilesResponse>(
      `/files/v3/files/search?${params.toString()}`
    );
  }

  /**
   * Fetch all files from HubSpot (handles pagination)
   */
  async getAllFiles(): Promise<HubSpotFile[]> {
    const allFiles: HubSpotFile[] = [];
    let after: string | undefined;

    do {
      const response = await this.searchFiles({ limit: 100, after });
      allFiles.push(...response.results);
      after = response.paging?.next?.after;
    } while (after);

    return allFiles;
  }

  /**
   * Get a signed download URL for a file
   */
  async getSignedUrl(fileId: string): Promise<string> {
    const response = await this.request<{ url: string }>(
      `/files/v3/files/${fileId}/signed-url`
    );
    return response.url;
  }

  /**
   * Download file content from a URL
   */
  async downloadFile(url: string): Promise<Blob> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status}`);
    }
    return response.blob();
  }
}
