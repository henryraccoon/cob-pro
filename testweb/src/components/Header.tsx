import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header className="bg-blue-500 text-white p-4">
      <nav>
        <Link to="/" className="mr-4">
          Home
        </Link>
        <Link to="/about">About</Link>
      </nav>
    </header>
  );
}
