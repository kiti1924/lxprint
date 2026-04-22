import { useState } from 'react'
import './App.css'

import { PrinterContextProvider } from './context.tsx';

import Printer from './Printer'
import { LabelMaker } from './Label'
import { PhotoMaker } from './Photo'

function App() {
  const [activeTab, setActiveTab] = useState<'label' | 'photo'>('label');

  return (
    <PrinterContextProvider>
      <div className="app-container">
        <header>
          <h1>LX Print</h1>
          <Printer />
        </header>
        
        <main>
          <div className="tabs">
            <button 
              className={`tab-button ${activeTab === 'label' ? 'active' : ''}`}
              onClick={() => setActiveTab('label')}
            >
              Label
            </button>
            <button 
              className={`tab-button ${activeTab === 'photo' ? 'active' : ''}`}
              onClick={() => setActiveTab('photo')}
            >
              Photo
            </button>
          </div>

          <div className="tab-content">
            {activeTab === 'label' ? <LabelMaker /> : <PhotoMaker />}
          </div>
        </main>

        <footer>
          <p>Version {__APP_VERSION__}+{__COMMIT_HASH__}</p>
        </footer>
      </div>
    </PrinterContextProvider>
  )
}

export default App
