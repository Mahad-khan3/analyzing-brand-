const facebook = require('./facebook');
const instagram = require('./instagram');
const linkedin = require('./linkedin');
const twitter = require('./twitter');
const tiktok = require('./tiktok');
const pinterest = require('./pinterest');
const youtube = require('./youtube');

const providers = { facebook, instagram, linkedin, twitter, tiktok, pinterest, youtube };

const getProvider = (platform) => {
  const provider = providers[platform];
  if (!provider) throw new Error(`Unsupported platform: ${platform}`);
  return provider;
};

module.exports = { providers, getProvider };
