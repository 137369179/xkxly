/**
 * 国际化完整性检查工具
 * ------------------------------------------------------------
 * 扫描所有TSX/TS文件，检测未使用i18n的硬编码中文文本
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface HardcodedTextIssue {
  file: string;
  line: number;
  text: string;
  suggestion?: string;
}

/**
 * 检查文件中的硬编码中文
 */
function checkFile(filePath: string): HardcodedTextIssue[] {
  const issues: HardcodedTextIssue[] = [];
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    // 跳过测试文件和非源文件
    if (filePath.includes('.test.') || !filePath.match(/\.(tsx|ts)$/)) {
      return issues;
    }
    
    lines.forEach((line, index) => {
      // 检测中文字符（排除注释和字符串内部）
      const chineseChars = line.match(/[\u4e00-\u9fff]+/g);
      if (!chineseChars) return;
      
      // 跳过注释行
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
        return;
      }
      
      // 跳过已经是i18n调用的行
      if (line.includes('t(') || line.includes('translate(')) {
        return;
      }
      
      // 检测UI文本
      for (const match of chineseChars) {
        if (match.length < 2) continue; // 太短的忽略
        
        // 常见需要翻译的文本模式
        const patterns = [
          /正在|加载|成功|失败|错误|提示|确认|取消/,
          /分钟|小时|天|周|月|年/,
          /正确|错误|答案|选项/,
          /继续|返回|下一|上一/,
          /学习|练习|复习|测试/,
          /星星|徽章|奖励|成就/,
          /家长|设置|帮助|关于/,
        ];
        
        for (const pattern of patterns) {
          if (pattern.test(match)) {
            issues.push({
              file: filePath,
              line: index + 1,
              text: match,
            });
            break;
          }
        }
      }
    });
  } catch (e) {
    console.warn(`读取文件失败: ${filePath}`, e);
  }
  
  return issues;
}

/**
 * 递归扫描目录
 */
function scanDirectory(dirPath: string): HardcodedTextIssue[] {
  const allIssues: HardcodedTextIssue[] = [];
  
  function walk(currentPath: string) {
    const entries = readdirSync(currentPath);
    
    for (const entry of entries) {
      const fullPath = join(currentPath, entry);
      const stats = statSync(fullPath);
      
      if (stats.isDirectory()) {
        // 跳过node_modules和特定目录
        if (!entry.includes('node_modules') && 
            !entry.includes('.git') &&
            !entry.includes('__tests__')) {
          walk(fullPath);
        }
      } else if (stats.isFile() && (entry.endsWith('.tsx') || entry.endsWith('.ts'))) {
        const issues = checkFile(fullPath);
        allIssues.push(...issues);
      }
    }
  }
  
  walk(dirPath);
  return allIssues;
}

/**
 * 主函数
 */
export function findHardcodedChinese(srcDir: string = './src'): Report {
  const issues = scanDirectory(srcDir);
  
  // 按文件分组统计
  const byFile: Record<string, number> = {};
  for (const issue of issues) {
    const fileName = issue.file.replace(srcDir + '/', '');
    byFile[fileName] = (byFile[fileName] || 0) + 1;
  }
  
  return {
    totalIssues: issues.length,
    filesWithIssues: Object.keys(byFile).length,
    topFiles: Object.entries(byFile)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10),
    sampleIssues: issues.slice(0, 20),
  };
}

interface Report {
  totalIssues: number;
  filesWithIssues: number;
  topFiles: Array<[string, number]>;
  sampleIssues: HardcodedTextIssue[];
}

// 导出CLI入口
if (require.main === module) {
  const report = findHardcodedChinese();
  console.log('\n=== 硬编码中文检测结果 ===\n');
  console.log(`共发现 ${report.totalIssues} 处硬编码中文`);
  console.log(`涉及 ${report.filesWithIssues} 个文件\n`);
  
  if (report.topFiles.length > 0) {
    console.log('问题最多的文件TOP 10:');
    report.topFiles.forEach(([file, count]) => {
      console.log(`  ${file}: ${count}处`);
    });
  }
  
  if (report.sampleIssues.length > 0) {
    console.log('\n示例问题:');
    report.sampleIssues.slice(0, 5).forEach(issue => {
      console.log(`  ${issue.file}:${issue.line} - "${issue.text}"`);
    });
  }
}
