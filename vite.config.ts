import { defineConfig } from 'vite'; // 从 Vite 库中导入 defineConfig 函数，用于定义 Vite 配置
import legacy from '@vitejs/plugin-legacy'; // 导入 legacy 插件，用于支持旧版浏览器
import react from '@vitejs/plugin-react'; // 导入 react 插件，用于支持 React 应用
// @ts-ignore // 忽略 TypeScript 类型检查错误
import { removeConsolePlugin } from './src/vitePlugin/index.ts'; // 从本地模块导入 removeConsolePlugin 插件，用于移除控制台输出
import { visualizer } from 'rollup-plugin-visualizer'; // 导入 visualizer 插件，用于可视化打包结果

export default defineConfig({ // 导出默认的 Vite 配置对象
  plugins: [ // 配置 Vite 插件数组
    react(), // 使用 react 插件
    legacy({ // 使用 legacy 插件，配置目标浏览器
      targets: ['defaults', 'not IE 11'], // 支持默认浏览器，但不支持 IE 11
    }),
    removeConsolePlugin(), // 使用 removeConsolePlugin 插件，移除控制台输出
    visualizer({ // 使用 visualizer 插件，配置可视化选项
      open: true, // 打包完成后自动打开可视化报告
      gzipSize: true, // 显示 Gzip 压缩后的大小
      brotliSize: true, // 显示 Brotli 压缩后的大小
    }), // Visualize bundle size
  ],
  build: { // 配置构建选项
    target: 'es2018', // 设置构建目标为 ES2018，以获得更广泛的兼容性
    minify: 'esbuild', // 使用 esbuild 进行代码压缩，比 terser 更快，输出更小
    chunkSizeWarningLimit: 1500, // 调整 chunk 大小警告限制，根据需要调整
    rollupOptions: { // 配置 Rollup 打包选项
      output: {
        manualChunks: (id) => { // 手动分割 chunks，根据模块 ID 决定 chunk 名称
           id=String(id);
          if (id.includes('node_modules')) { // 如果模块来自 node_modules
            // Core vendors
            if (id.includes('react') || id.includes('react-dom')) return 'react-vendor'; // React 核心库
            if (id.includes('antd') || id.includes('@ant-design')) return 'ui-vendor'; // Ant Design UI 库
            if (id.includes('monaco-editor')) return 'editor-core'; // Monaco 编辑器核心

            // TypeScript handling
            if (id.includes('typescript') || id.includes('@typescript')) { // 处理 TypeScript 相关模块
              // Only include runtime if needed, exclude compiler
              if (id.includes('/lib/') || id.includes('/lib-es/')) { // 只包含运行时，排除编译器
                return 'typescript-runtime';
              }
              return null; // 排除 TypeScript 编译器，不包含在 bundle 中
            }

            // Utilities and other libs
            if (id.includes('babel')) return 'babel'; // Babel 相关模块
            if (id.includes('lodash') || id.includes('classnames') || id.includes('copy-to-clipboard'))
              return 'utils'; // 常用工具库
            if (id.includes('fflate') || id.includes('jszip') || id.includes('file-saver'))
              return 'compression'; // 压缩相关库

            return 'vendor'; // 其他 node_modules 模块归入 vendor chunk
          }
        },
      },
      external: [ // 配置外部模块，不包含在 bundle 中
        'typescript', // 将 TypeScript 编译器设为外部模块，需要时通过 CDN 加载
      ],
    },
  },
  optimizeDeps: { // 配置依赖优化选项
    include: ['react', 'react-dom'], // 预打包关键依赖，提高启动速度
  },
   // 添加解析别名，将 typescript 指向 CDN
   resolve: {
    alias: {
      '@': '/src',
      'typescript': 'https://unpkg.com/typescript@latest/lib/typescript.js', // ESM 方式
    },
  },
});