import BezierFitting from './components/BezierFitting'

function App() {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Curve Drawer
        </h1>
        <BezierFitting />
      </div>
    </div>
  )
}

export default App
