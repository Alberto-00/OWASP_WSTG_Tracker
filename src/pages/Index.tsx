import { LanguageProvider } from '@/hooks/useLanguage';
import { ChecklistApp } from '@/components/ChecklistApp';

const Index = () => (
  <LanguageProvider>
    <ChecklistApp />
  </LanguageProvider>
);

export default Index;
