// 支持的文件语言类型
export type FileLanguage = 'typescript' | 'javascript' | 'css' | 'json' | 'tsx' | 'jsx';

// 单个文件的接口定义
export interface File {
  name: string;           // 文件名
  language: FileLanguage; // 文件语言类型
  value: string;         // 文件内容
}

// 文件集合的接口定义
export interface Files {
  [key: string]: File;
}