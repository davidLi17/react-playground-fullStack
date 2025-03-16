// ata.ts - 优化类型获取设置
import { setupTypeAcquisition } from '@typescript/ata';

// 使用一个记忆化的实例来避免创建多个ATA实例
let ataInstance: ReturnType<typeof setupTypeAcquisition> | null = null;

export function createATA(onDownloadFile: (code: string, path: string) => void) {
  // 如果实例已经创建，则返回现有实例,单例模式
  if (ataInstance) return ataInstance;
  
  // 创建一个新的ATA实例
  ataInstance = setupTypeAcquisition({
    projectName: 'my-ata', // 项目名称
    //@ts-ignore
    typescript: window.ts, // 忽略类型检查，直接使用window上的ts对象
    fetcher: fetch, // 使用浏览器自带的fetch函数进行网络请求
    logger: {
      // 日志配置，只记录错误信息以减少控制台噪音
      log: () => {}, // 空函数，不记录普通日志
      error: console.error, // 记录错误日志
      groupCollapsed: () => {}, // 空函数，不折叠日志组
      groupEnd: () => {}, // 空函数，不结束日志组
    },
    delegate: {
      // 代理配置，处理接收到的文件
      receivedFile: (code, path) => {
        // console.log('自动下载的包', path); // 可以取消注释以查看自动下载的包路径
        onDownloadFile(code, path); // 调用传入的回调函数处理下载的文件
      }
    },
  });
  
  // 返回新创建的ATA实例
  return ataInstance;
}

// 清除实例的函数，通常在组件卸载时调用
export function clearATA() {
ataInstance = null; // 将实例设置为null，释放资源
}