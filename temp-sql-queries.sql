-- Make user a leader in the Decatur group
UPDATE group_members
SET role = 'leader'
WHERE user_id = (SELECT id FROM profiles WHERE email = 'meredith.stuart+leader@leaderimpact.com')
  AND group_id = (SELECT id FROM groups WHERE name ILIKE '%Decatur%');

-- Or make them group admin (can see join code, full control)
-- UPDATE group_members
-- SET role = 'admin'
-- WHERE user_id = (SELECT id FROM profiles WHERE email = 'meredith.stuart+leader@leaderimpact.com')
--   AND group_id = (SELECT id FROM groups WHERE name ILIKE '%Decatur%');

-- Verify the change
SELECT p.email, g.name AS group_name, gm.role
FROM group_members gm
JOIN profiles p ON p.id = gm.user_id
JOIN groups g ON g.id = gm.group_id
WHERE p.email = 'meredith.stuart+leader@leaderimpact.com';
