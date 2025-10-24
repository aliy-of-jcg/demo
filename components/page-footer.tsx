export function PageFooter() {
  return (
    <footer className="mt-auto border-t border-gray-200 bg-gray-50 py-4 px-8">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <p>
          © {new Date().getFullYear()} CosMos AI. All rights reserved.
        </p>
        <p>
          Made with ❤️ by JCG .Inc
        </p>
      </div>
    </footer>
  );
}

