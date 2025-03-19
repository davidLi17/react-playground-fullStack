module.exports = {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class', // 使用 class 策略进行暗色模式切换
    theme: {
      extend: {
        // 可以在这里添加自定义主题变量
        colors: {
          primary: {
            light: '#3b82f6', // 浅色主题的主色
            dark: '#60a5fa',  // 深色主题的主色
          },
        },
      },
    },
    plugins: [],
  }