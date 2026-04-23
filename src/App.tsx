import { Toolbar } from './components/Toolbar';
import { Workspace } from './components/Workspace';
import { StatusBar } from './components/StatusBar';

function App() {
  // В будущем эти стейты будут меняться при загрузке картинки
  const currentWidth = 0;
  const currentHeight = 0;
  const currentColorDepth = 0;

  return (
    <div className="h-screen w-screen flex flex-col bg-editor-bg text-editor-text overflow-hidden">
      <Toolbar />
      <Workspace />
      <StatusBar 
        width={currentWidth} 
        height={currentHeight} 
        colorDepth={currentColorDepth} 
      />
    </div>
  );
}

export default App;