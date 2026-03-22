module.exports = {
  apps: [
    {
      name: "mission-control",
      script: "npm",
      args: "run start",
      cwd: "/Users/iamashyguy/.openclaw/workspace/mission-control",
      env: {
        PORT: 3333,
        NODE_ENV: "production",
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "/Users/iamashyguy/.openclaw/logs/mc-error.log",
      out_file: "/Users/iamashyguy/.openclaw/logs/mc-out.log",
      merge_logs: true,
    },
  ],
};
