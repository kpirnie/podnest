package apiutil

import (
	"encoding/csv"
	"fmt"
	"io"
	"net/http"
	"podnest/internal/logger"
)

// ExportCSV writes rows as a CSV file download with the given filename and header.
func ExportCSV(w http.ResponseWriter, filename string, header []string, rows [][]string) {

	// set the necessary headers to trigger a file download in the browser
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))

	// create a CSV writer and write the header and rows to the response
	cw := csv.NewWriter(w)
	_ = cw.Write(header)
	for _, row := range rows {
		_ = cw.Write(row)
	}

	// flush the CSV writer to ensure all data is sent to the client
	cw.Flush()
}

// ImportCSV parses a multipart CSV upload and returns all data rows with the header skipped.
func ImportCSV(r *http.Request) ([][]string, error) {

	// parse the multipart form with a reasonable size limit (2MB in this case)
	if err := r.ParseMultipartForm(2 << 20); err != nil {
		logger.Error("failed to parse multipart form: %w", err)
		return nil, fmt.Errorf("failed to parse multipart form: %w", err)
	}
	f, _, err := r.FormFile("file")
	if err != nil {
		logger.Error("failed to retrieve file from form: %w", err)
		return nil, fmt.Errorf("file field is required")
	}
	defer f.Close()

	// create a CSV reader with a size limit to prevent memory issues, and read all rows
	cr := csv.NewReader(io.LimitReader(f, 2<<20))
	all, err := cr.ReadAll()
	if err != nil {
		logger.Error("failed to read CSV: %w", err)
		return nil, fmt.Errorf("invalid CSV: %w", err)
	}
	if len(all) < 2 {
		logger.Error("CSV has no data rows")
		return nil, fmt.Errorf("CSV has no data rows")
	}

	// return all rows except the header (the first row)
	return all[1:], nil
}
