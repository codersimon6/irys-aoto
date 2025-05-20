const fs = require('fs');
const axios = require('axios');

const SCRAPER_URL = 'http://localhost:3000/cf-clearance-scraper';
const FAUCET_URL = 'https://irys.xyz/api/faucet';
const TARGET_URL = 'https://irys.xyz/faucet';
const SITE_KEY = '0x4AAAAAAA6vnrvBCtS4FAl-';

const addresses = fs.readFileSync('./address.txt', 'utf-8').trim().split('\n');
const proxies = fs.existsSync('./proxies.txt')
  ? fs.readFileSync('./proxies.txt', 'utf-8').trim().split('\n')
  : [];

const successLog = fs.createWriteStream('success.log', { flags: 'a' });
const errorLog = fs.createWriteStream('error.log', { flags: 'a' });

function logSuccess(msg) {
  console.log(`✅ ${msg}`);
  successLog.write(msg + '\n');
}

function logError(msg) {
  console.error(`❌ ${msg}`);
  errorLog.write(msg + '\n');
}

async function getToken(wallet, proxy) {
  const body = {
    url: TARGET_URL,
    siteKey: SITE_KEY,
    mode: 'turnstile-max'
  };

  console.log(`🧠 正在为 ${wallet} 破解 Turnstile 验证码...`);

  if (proxy) {
    try {
      const proxyUrl = new URL(proxy);
      body.proxy = {
        host: proxyUrl.hostname,
        port: parseInt(proxyUrl.port),
        username: proxyUrl.username || undefined,
        password: proxyUrl.password || undefined
      };
    } catch (err) {
      logError(`${wallet} - 无效代理格式: ${proxy}`);
      return null;
    }
  }

  try {
    const res = await axios.post(SCRAPER_URL, body, {
      headers: { 'Content-Type': 'application/json' }
    });

    const json = res.data;
    const token = json.captchaToken || json.token;

    if (token) {
      console.log(`🎫 ${wallet} 成功获取 Token`);
      return {
        token,
        userAgent: json.headers?.['user-agent'] || 'Mozilla/5.0',
        cookie: json.cookies?.map(c => `${c.name}=${c.value}`).join('; ') || ''
      };
    } else {
      logError(`${wallet} - token 获取失败: ${JSON.stringify(json)}`);
      return null;
    }
  } catch (err) {
    logError(`${wallet} - 请求错误: ${err.message}`);
    return null;
  }
}

async function submitFaucet(wallet, tokenData) {
  try {
    const res = await axios.post(FAUCET_URL, {
      captchaToken: tokenData.token,
      walletAddress: wallet
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Origin': TARGET_URL,
        'Referer': TARGET_URL,
        'User-Agent': tokenData.userAgent,
        'Cookie': tokenData.cookie
      }
    });

    if (res.data?.success) {
      logSuccess(`${wallet} - Faucet 成功: ${res.data.message}`);
    } else {
      logError(`${wallet} - Faucet 异常返回: ${JSON.stringify(res.data)}`);
    }
  } catch (err) {
    logError(`${wallet} - Faucet 请求失败: ${JSON.stringify(err.response?.data || err.message)}`);
  }
}

(async () => {
  for (let i = 0; i < addresses.length; i++) {
    const wallet = addresses[i].trim();
    const proxy = proxies[i]?.trim() || null;

    if (!wallet.startsWith('0x')) continue;

    console.log(`🚀 处理地址: ${wallet}`);
    if (proxy) console.log(`🌐 使用代理: ${proxy}`);

    const tokenData = await getToken(wallet, proxy);
    if (!tokenData) {
      logError(`${wallet} - 跳过（未获取到 token）`);
      continue;
    }

    await submitFaucet(wallet, tokenData);
    console.log('-----------------------------------');
    await new Promise(r => setTimeout(r, 5000));
  }

  successLog.close();
  errorLog.close();
})();
