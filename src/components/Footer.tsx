export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-gray-300 py-4 text-center text-sm text-gray-800">
      © {currentYear} Dan Choiniere
    </footer>
  );
}
