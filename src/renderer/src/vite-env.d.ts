/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    platform: string;
    versions: NodeJS.ProcessVersions;
  };
}