import BezierFitting from './components/BezierFitting'

function App() {
  return (
    <div className="min-h-screen bg-gray-100 py-4">
      <div className="w-full px-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 text-center">
          Curve Drawer
        </h1>
        <BezierFitting />
      </div>
    </div>
  )
}

export default App
