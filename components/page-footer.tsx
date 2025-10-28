export function PageFooter() {
  return (
    <footer className="mt-auto border-t border-gray-200 bg-gray-50 py-3 sm:py-4 px-4 sm:px-8">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
        <p className="text-center sm:text-left">
          © {new Date().getFullYear()} CosMos AI. All rights reserved.
        </p>
        <p className="text-center sm:text-right">
          Made with ❤️ by JCG .Inc
        </p>
      </div>
    </footer>
  );
}

