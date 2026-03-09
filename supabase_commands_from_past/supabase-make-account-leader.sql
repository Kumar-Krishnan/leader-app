-- Grant organizer role (can create groups) to a user by email
UPDATE profiles
SET role = 'organizer'
WHERE email = 'meredith.stuart+leader@leaderimpact.com';
