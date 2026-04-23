import { useState, use } from 'react'
import './App.css'

import { PrinterContextProvider, PrinterContext } from './context.tsx';

import Printer from './Printer'
import { LabelMaker } from './Label'
import { PhotoMaker } from './Photo'

function AppContent() {
  const [activeTab, setActiveTab] = useState<'label' | 'photo'>('label');
  const { language, setLanguage, t } = use(PrinterContext);

  return (
    <div className="app-container">
      <header>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>{t('appTitle')}</h1>
          <div className="language-switcher" style={{ display: 'flex', gap: '5px' }}>
            <button 
              className={`lang-button ${language === 'en' ? 'active' : ''}`}
              onClick={() => setLanguage('en')}
              style={{ padding: '4px 8px', fontSize: '0.8em', cursor: 'pointer' }}
            >
              EN
            </button>
            <button 
              className={`lang-button ${language === 'jp' ? 'active' : ''}`}
              onClick={() => setLanguage('jp')}
              style={{ padding: '4px 8px', fontSize: '0.8em', cursor: 'pointer' }}
            >
              JP
            </button>
          </div>
        </div>
        <Printer />
      </header>
      
      <main>
        <div className="tabs">
          <button 
            className={`tab-button ${activeTab === 'label' ? 'active' : ''}`}
            onClick={() => setActiveTab('label')}
          >
            {t('tabLabel')}
          </button>
          <button 
            className={`tab-button ${activeTab === 'photo' ? 'active' : ''}`}
            onClick={() => setActiveTab('photo')}
          >
            {t('tabPhoto')}
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'label' ? <LabelMaker /> : <PhotoMaker />}
        </div>
      </main>

      <footer>
        <p>{t('version')} {__APP_VERSION__}+{__COMMIT_HASH__}</p>
      </footer>
    </div>
  );
}

function App() {
  return (
    <PrinterContextProvider>
      <AppContent />
    </PrinterContextProvider>
  )
}

export default App
