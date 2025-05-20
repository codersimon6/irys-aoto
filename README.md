# Irys Faucet 自动领取脚本使用说明

## 🧾 项目简介

这是一个基于 **Node.js** 的自动化脚本，用于批量领取 [Irys Faucet](https://irys.xyz/faucet) 测试币。  
它依赖 `cf-clearance-scraper` 进行 Cloudflare Turnstile 验证码破解，支持：

- 多地址批量处理  
- 支持代理绑定  
- 错误与成功日志输出  
- 可后台运行于 screen / crontab 中

---

## ✅ 环境要求

- Ubuntu 20.04 / 22.04 / 24.04
- Node.js ≥ v18（推荐使用 NodeSource 安装）
- Docker（用于运行 cf-clearance-scraper）
- screen（后台运行可选）

---

## 📦 脚本功能一览

| 模块           | 功能说明                                      |
|----------------|-----------------------------------------------|
| `address.txt`  | 多地址批量处理（每行一个钱包地址）           |
| `proxies.txt`  | 可选，绑定代理（每个地址一个代理）           |
| `bot.js`       | 主逻辑脚本，自动获取验证码 + 提交 Faucet     |
| `cf-scraper`   | Docker 容器，负责破解 Turnstile 验证码       |
| `irys.log`     | 日志文件，记录运行状态                       |
| `success.log`  | 成功领取的钱包记录                           |
| `error.log`    | 出错信息记录（代理失败 / token 获取失败）    |

---

## 🛠️ 手动操作流程

### 1. 安装 Node.js 和 Docker

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs docker.io
```

---

### 2. 启动 Cloudflare 破解容器

```bash
docker run -d --name cf-scraper -p 3000:3000 \
  -e PORT=3000 \
  -e browserLimit=5 \
  -e timeOut=60000 \
  zfcsoftware/cf-clearance-scraper:latest
```

---

### 3. 克隆仓库

```bash
git clone https://github.com/Gzgod/irys-local.git
cd irys-local
```

---

### 4. 编写文件

**地址文件：**

```text
0xabc123...
0xdef456...
```

保存为 `address.txt`，每行一个钱包地址。

**代理文件（可选）：**

```text
http://user:pass@ip:port
http://ip:port
```

保存为 `proxies.txt`，与地址一一对应。

---

### 5. 安装依赖并运行脚本

```bash
npm install
node bot.js
```

---

## 📄 日志查看

查看运行日志（后台执行推荐）：

```bash
tail -f irys.log
```

查看成功领取钱包地址：

```bash
cat success.log
```

查看失败记录（如代理错误、验证码失败等）：

```bash
cat error.log
```

---

## ❗ 常见问题

- **socket hang up**  
  ➜ 代理无法连接。建议使用稳定的 HTTP 代理，或不使用代理。

- **token 获取失败**  
  ➜ `cf-scraper` 容器未就绪或 Cloudflare 页面加载失败。可重启容器：

  ```bash
  docker restart cf-scraper
  ```

- **bot.js 没有反应**  
  ➜ 检查 `screen -r irys` 是否在运行，或直接运行：

  ```bash
  node bot.js
  ```

---
