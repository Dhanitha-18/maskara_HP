import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PaymentProvider } from './context/PaymentContext';
import { AppRouter } from './router/AppRouter';
import './App.css'; // keeps Vite structure intact

function App() {
  return (
    <AuthProvider>
      <PaymentProvider>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </PaymentProvider>
    </AuthProvider>
  );
}

export default App;
