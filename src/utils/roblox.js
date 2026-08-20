/**
 * Validates if a Roblox username exists.
 * @param {string} username
 * @returns {Promise<{ valid: boolean, userId?: number, username?: string }>}
 */
async function validateRobloxUsername(username) {
  if (!username || username.trim().length === 0) {
    return { valid: false };
  }

  try {
    const userRes = await fetch('https://users.roblox.com/v1/usernames/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernames: [username.trim()], excludeBannedUsers: false })
    });
    const userData = await userRes.json();
    if (userData.data && userData.data.length > 0) {
      return {
        valid: true,
        userId: userData.data[0].id,
        username: userData.data[0].name
      };
    }
    return { valid: false };
  } catch (error) {
    console.error('[Roblox Validation Error]:', error);
    return { valid: false };
  }
}

/**
 * Fetches Roblox Avatar / Headshot Image URL from Roblox API.
 * @param {string} username
 * @returns {Promise<string|null>}
 */
async function getRobloxHeadshot(username) {
  try {
    const { valid, userId } = await validateRobloxUsername(username);
    if (!valid || !userId) return null;

    // Fetch avatar bust / headshot
    const thumbRes = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-bust?userIds=${userId}&size=420x420&format=Png&isCircular=false`);
    const thumbData = await thumbRes.json();
    return thumbData.data?.[0]?.imageUrl || null;
  } catch (error) {
    console.error('[Roblox API Error]:', error);
    return null;
  }
}

module.exports = { validateRobloxUsername, getRobloxHeadshot };
