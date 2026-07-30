import { Routes, Route } from "react-router-dom";

function Home() {
  return (
    <main>
      <h1>LiberaGo</h1>
      <p>hola — el pipeline de deploy funciona.</p>
    </main>
  );
}

function ClientePlaceholder() {
  return <p>Vista cliente — pendiente de sistema de diseño.</p>;
}

function TrabajadorPlaceholder() {
  return <p>Vista trabajador — pendiente de sistema de diseño.</p>;
}

function AdminPlaceholder() {
  return <p>Vista admin — pendiente de sistema de diseño.</p>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/cliente/*" element={<ClientePlaceholder />} />
      <Route path="/trabajador/*" element={<TrabajadorPlaceholder />} />
      <Route path="/admin/*" element={<AdminPlaceholder />} />
    </Routes>
  );
}
