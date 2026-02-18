import Editor from '@monaco-editor/react';

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  language: string;
  readOnly?: boolean;
}

function CodeEditor({ code, onChange, language, readOnly = false }: CodeEditorProps) {
  // Map debugging challenge types to Monaco language modes
  const getMonacoLanguage = (lang: string) => {
    if (lang.startsWith('selenium-') || lang.startsWith('springboot-')) {
      return 'java';
    }
    return lang;
  };

  return (
    <div className="h-full border border-gray-200 rounded-lg overflow-hidden">
      <Editor
        height="100%"
        defaultLanguage="java"
        language={getMonacoLanguage(language)}
        value={code}
        onChange={(value) => onChange(value || '')}
        theme="light"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          roundedSelection: false,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 16, bottom: 16 },
          suggestOnTriggerCharacters: true,
          quickSuggestions: true,
          wordWrap: 'on',
          readOnly: readOnly,
        }}
      />
    </div>
  );
}

export default CodeEditor;
