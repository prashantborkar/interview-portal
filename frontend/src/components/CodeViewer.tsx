import Editor from '@monaco-editor/react';

interface CodeViewerProps {
  code: string;
  language: string;
}

function CodeViewer({ code, language }: CodeViewerProps) {
  // Map debugging challenge types to Monaco language modes
  const getMonacoLanguage = (lang: string) => {
    if (lang.startsWith('selenium-') || lang.startsWith('springboot-')) {
      return 'java';
    }
    return lang;
  };

  return (
    <div className="h-[600px] border border-gray-200 rounded-lg overflow-hidden">
      <Editor
        height="100%"
        defaultLanguage="java"
        language={getMonacoLanguage(language)}
        value={code}
        theme="light"
        options={{
          readOnly: true,
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          roundedSelection: false,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 16, bottom: 16 },
        }}
      />
    </div>
  );
}

export default CodeViewer;
