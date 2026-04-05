module.exports = {
  apps: [
    {
      name:         "f1air-backend",
      script:       "server.js",
      watch:        false,          // set true if you want auto-reload on file change
      autorestart:  true,           // restart on crash
      max_restarts: 10,             // max restart attempts before giving up
      restart_delay: 2000,          // wait 2s between restarts
      min_uptime:   "5s",           // consider stable if runs > 5s
      env: {
        NODE_ENV: "development",
        PORT:     5000,
      },
      // Auto-restart every 6 hours to keep MongoDB connection fresh
      cron_restart: "0 */6 * * *",
      // Log files
      out_file:  "./logs/out.log",
      error_file: "./logs/error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
