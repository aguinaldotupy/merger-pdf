# PDF Merger API

This project is a Node.js application that provides an API to merge multiple PDF files into a single PDF. It uses Express for handling HTTP requests and pdf-lib for PDF manipulation.

## Features

- Merge multiple PDF files into a single PDF.
- Set metadata such as title, author, subject, and keywords for the merged PDF.
- Download the merged PDF directly from the API.

## Prerequisites

- Node.js (version 14 or higher)
- npm or yarn

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/pdf-merger-api.git
   cd pdf-merger-api
   ```

2. Install the dependencies:

   ```bash
   npm install
   ```

   or

   ```bash
   yarn install
   ```

## Usage

1. Start the server:

   ```bash
   npm start
   ```

   or

   ```bash
   yarn start
   ```

2. The server will run on port 3000 by default. You can access the API at `http://localhost:3000`.

### API Endpoints

#### POST /

Merge multiple PDF files.

- **Request Body**: JSON object with the following fields:
  - `title` (string): Title of the merged PDF.
  - `author` (string, optional): Author of the merged PDF.
  - `subject` (string, optional): Subject of the merged PDF.
  - `keywords` (array of strings, optional): Keywords for the merged PDF.
  - `sources` (array of strings): URLs of the PDF files to merge.

- **Response**: The merged PDF file.

**Example Request with `curl`:**

```bash
curl -X POST http://localhost:3000/ \
-H "Content-Type: application/json" \
-d '{
  "title": "merged-document",
  "author": "John Doe",
  "subject": "Merged PDF",
  "keywords": ["pdf", "merge", "example"],
  "sources": [
    "https://example.com/file1.pdf",
    "https://example.com/file2.pdf"
  ]
}'
```

#### GET /health

Check the health status of the server.

- **Response**: A simple message indicating the server is healthy.

## Error Handling

- The API returns a 400 status code for invalid request bodies.
- A 500 status code is returned for internal server errors.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## Contact

For questions or support, please contact [your-email@example.com](mailto:your-email@example.com). 