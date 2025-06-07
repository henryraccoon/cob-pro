export default function QuestionForm() {
  return (
    <form className="space-y-6 max-w-4xl mx-auto p-4 bg-white rounded shadow">
      <div>
        <label className="block mb-2 font-semibold text-gray-700">
          Choose an option:
        </label>
        <div className="space-y-1">
          <label className="inline-flex items-center space-x-2">
            <input
              type="radio"
              name="radio"
              value="a"
              className="form-radio text-indigo-600"
            />
            <span>A</span>
          </label>
          <label className="inline-flex items-center space-x-2">
            <input
              type="radio"
              name="radio"
              value="b"
              className="form-radio text-indigo-600"
            />
            <span>B</span>
          </label>
        </div>
      </div>

      <div>
        <label className="block mb-2 font-semibold text-gray-700">
          Select your interests:
        </label>
        <div className="space-y-1">
          <label className="inline-flex items-center space-x-2">
            <input
              type="checkbox"
              value="1"
              className="form-checkbox text-indigo-600"
            />
            <span>Coding</span>
          </label>
          <label className="inline-flex items-center space-x-2">
            <input
              type="checkbox"
              value="2"
              className="form-checkbox text-indigo-600"
            />
            <span>Music</span>
          </label>
        </div>
      </div>

      <div>
        <label
          htmlFor="dropdown"
          className="block mb-2 font-semibold text-gray-700"
        >
          Select a country:
        </label>
        <select
          id="dropdown"
          className="block w-full rounded border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="us">USA</option>
          <option value="ca">Canada</option>
        </select>
      </div>

      <div>
        <a
          href="https://www.google.com"
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 underline hover:text-blue-800"
        >
          Go to Google
        </a>
      </div>

      <div>
        <a
          href="/about"
          className="text-blue-600 underline hover:text-blue-800"
        >
          Visit About Page
        </a>
      </div>
    </form>
  );
}
