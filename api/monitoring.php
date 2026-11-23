<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

$csvPath = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'csv' . DIRECTORY_SEPARATOR . 'LLDA_2020_2025_combined_partial.csv';
$coordinatePath = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'csv' . DIRECTORY_SEPARATOR . 'LLDA_2020Q4_estimated_station_coordinates.csv';

function failResponse(string $message, int $status = 500): void
{
    http_response_code($status);
    echo json_encode(['ok' => false, 'error' => $message], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function normalizeHeader(?string $value): string
{
    return strtolower(trim(preg_replace('/^\xEF\xBB\xBF/', '', (string)$value)));
}

function numericValue(?string $value): ?float
{
    $value = trim((string)$value);
    if ($value === '' || in_array(strtolower($value), ['na', 'n/a', 'null', '-', '—'], true)) return null;
    $value = str_replace(',', '', $value);
    return is_numeric($value) ? (float)$value : null;
}

function normalizeDate(?string $value): ?string
{
    $value = trim((string)$value);
    if (preg_match('/^\d{4}-\d{2}$/', $value)) return $value . '-01';
    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) return $value;
    return null;
}

if (!is_readable($csvPath)) failResponse('Monitoring CSV not found.', 404);

// The source CSV has empty latitude/longitude fields. These named-area anchors
// keep stations visible while clearly marking their positions as approximate.
$coordinateHints = [
    'I' => [14.4300, 121.1300, 'Central West Bay area anchor; exact coordinates are not in the CSV.'],
    'II' => [14.3700, 121.4100, 'East Bay area anchor; exact coordinates are not in the CSV.'],
    'IV' => [14.3400, 121.2700, 'Central Bay area anchor; exact coordinates are not in the CSV.'],
    'V' => [14.4900, 121.1600, 'Northern West Bay area anchor; exact coordinates are not in the CSV.'],
    'VIII' => [14.2600, 121.3200, 'South Bay area anchor; exact coordinates are not in the CSV.'],
    'XIII' => [14.5000, 121.1100, 'Taytay area anchor; exact coordinates are not in the CSV.'],
    'XV' => [14.3100, 121.0800, 'San Pedro area anchor; exact coordinates are not in the CSV.'],
    'XVI' => [14.2600, 121.1400, 'Sta. Rosa area anchor; exact coordinates are not in the CSV.'],
    'XVII' => [14.3400, 121.2700, 'Central Bay fish sanctuary anchor; exact coordinates are not in the CSV.'],
    'XVIII' => [14.3000, 121.3500, 'Pagsanjan / East Bay area anchor; exact coordinates are not in the CSV.'],
    'XIX' => [14.3400, 121.0900, 'Muntinlupa area anchor; exact coordinates are not in the CSV.'],
    'XX' => [14.3900, 121.3500, 'GEMS area anchor; exact coordinates are not in the CSV.'],
    'XXI' => [14.4500, 121.3300, 'Cardona area anchor; exact coordinates are not in the CSV.'],
    'XXII' => [14.4200, 121.3300, 'Jala-jala area anchor; exact coordinates are not in the CSV.'],
    'XXIII' => [14.3200, 121.4200, 'Lumban area anchor; exact coordinates are not in the CSV.'],
];

// Prefer the supplied coordinate update for station IDs it contains. Its own
// status says these are estimates, so they remain visibly approximate in the UI.
$coordinateRows = 0;
$coordinateUpdateIds = [];
if (is_readable($coordinatePath) && ($coordinateHandle = fopen($coordinatePath, 'rb')) !== false) {
    $coordinateHeader = fgetcsv($coordinateHandle);
    if ($coordinateHeader !== false) {
        $coordinateHeaders = array_map('normalizeHeader', $coordinateHeader);
        $coordinateIndex = [];
        foreach ($coordinateHeaders as $index => $header) $coordinateIndex[$header] = $index;
        while (($coordinateValues = fgetcsv($coordinateHandle)) !== false) {
            $coordinateValues = array_pad($coordinateValues, count($coordinateHeaders), '');
            $coordinateRecord = [];
            foreach ($coordinateHeaders as $index => $header) $coordinateRecord[$header] = trim((string)($coordinateValues[$index] ?? ''));
            $coordinateId = trim($coordinateRecord['station_id'] ?? '');
            $coordinateLatitude = numericValue($coordinateRecord['latitude_estimated'] ?? '');
            $coordinateLongitude = numericValue($coordinateRecord['longitude_estimated'] ?? '');
            if ($coordinateId === '' || $coordinateLatitude === null || $coordinateLongitude === null) continue;
            $status = $coordinateRecord['coordinate_status'] ?: 'Approximate coordinate estimate.';
            $source = $coordinateRecord['source'] ?: 'LLDA Q4 2020 station map estimate';
            $coordinateHints[$coordinateId] = [$coordinateLatitude, $coordinateLongitude, $status . ' Source: ' . $source, $status, $source];
            $coordinateUpdateIds[$coordinateId] = true;
            $coordinateRows++;
        }
    }
    fclose($coordinateHandle);
}

$definitions = [
    'do' => ['name' => 'Dissolved Oxygen', 'unit' => 'mg/L', 'column' => 'do_mg_l', 'description' => 'Dissolved oxygen concentration reported in the source CSV.'],
    'ph' => ['name' => 'pH', 'unit' => 'pH units', 'column' => 'ph', 'description' => 'Acidity/alkalinity reading reported in the source CSV.'],
    'bod' => ['name' => 'Biochemical Oxygen Demand', 'unit' => 'mg/L', 'column' => 'bod_mg_l', 'description' => 'Five-day biochemical oxygen demand reported in the source CSV.'],
    'cod' => ['name' => 'Chemical Oxygen Demand', 'unit' => 'mg/L', 'column' => 'cod_mg_l', 'description' => 'Chemical oxygen demand reported in the source CSV.'],
    'turbidity' => ['name' => 'Turbidity', 'unit' => 'NTU', 'column' => 'turbidity_ntu', 'description' => 'Water clarity indicator reported in the source CSV.'],
    'temperature' => ['name' => 'Temperature', 'unit' => '°C', 'column' => 'temperature_c', 'description' => 'Surface-water temperature reported in the source CSV.'],
    'nitrate' => ['name' => 'Nitrate', 'unit' => 'mg/L', 'column' => 'nitrate_mg_l', 'description' => 'Nitrate concentration reported in the source CSV.'],
    'phosphate' => ['name' => 'Phosphate', 'unit' => 'mg/L', 'column' => 'phosphate_mg_l', 'description' => 'Phosphate concentration reported in the source CSV.'],
    'fecal_coliform' => ['name' => 'Fecal Coliform', 'unit' => 'MPN/100 mL', 'column' => 'fecal_coliform_mpn_100ml', 'description' => 'Fecal coliform count reported in the source CSV.'],
];

$handle = fopen($csvPath, 'rb');
if ($handle === false) failResponse('Monitoring CSV could not be opened.');

$headerRow = fgetcsv($handle);
if ($headerRow === false) failResponse('Monitoring CSV has no header row.');

$headers = array_map('normalizeHeader', $headerRow);
$headerIndex = [];
foreach ($headers as $index => $header) $headerIndex[$header] = $index;
foreach (['station_id', 'station_name', 'sample_month'] as $required) {
    if (!array_key_exists($required, $headerIndex)) failResponse("Monitoring CSV is missing the {$required} column.", 422);
}

$stations = [];
$dates = [];
$parameterCounts = array_fill_keys(array_keys($definitions), 0);
$rowCount = 0;
$skippedRows = 0;

while (($values = fgetcsv($handle)) !== false) {
    if (count($values) === 1 && trim((string)$values[0]) === '') continue;
    $values = array_pad($values, count($headers), '');
    $record = [];
    foreach ($headers as $index => $header) $record[$header] = trim((string)($values[$index] ?? ''));

    $stationId = trim($record['station_id'] ?? '');
    $stationName = trim($record['station_name'] ?? '');
    $date = normalizeDate($record['sample_month'] ?? '');
    if ($stationId === '' || $stationName === '' || $date === null) {
        $skippedRows++;
        continue;
    }

    $hint = $coordinateHints[$stationId] ?? [null, null, 'No coordinates are available in the coordinate update.', 'No coordinate update', 'No coordinate source'];
    if (!isset($stations[$stationId])) {
        $csvLatitude = numericValue($record['latitude'] ?? '');
        $csvLongitude = numericValue($record['longitude'] ?? '');
        $stations[$stationId] = [
            'id' => $stationId,
            'code' => $stationId,
            'name' => $stationName,
            'latitude' => $csvLatitude ?? $hint[0],
            'longitude' => $csvLongitude ?? $hint[1],
            'coordinates_approximate' => $csvLatitude === null || $csvLongitude === null,
            'coordinate_note' => $csvLatitude !== null && $csvLongitude !== null ? 'Coordinates supplied by the monitoring CSV.' : $hint[2],
            'coordinate_status' => $csvLatitude !== null && $csvLongitude !== null ? 'CSV coordinate' : ($hint[3] ?? 'Approximate coordinate estimate.'),
            'coordinate_source' => $csvLatitude !== null && $csvLongitude !== null ? 'LLDA monitoring CSV' : ($hint[4] ?? 'Coordinate fallback'),
            'source' => $record['data_type'] ?: 'Local CSV dataset',
            'source_url' => $record['source_url'] ?: null,
            'source_urls' => [],
            'observations' => [],
        ];
    }

    $station =& $stations[$stationId];
    $sourceUrl = trim($record['source_url'] ?? '');
    if ($sourceUrl !== '' && !in_array($sourceUrl, $station['source_urls'], true)) $station['source_urls'][] = $sourceUrl;

    $stationLatitude = numericValue($record['latitude'] ?? '');
    $stationLongitude = numericValue($record['longitude'] ?? '');
    if ($stationLatitude !== null && $stationLongitude !== null) {
        $station['latitude'] = $stationLatitude;
        $station['longitude'] = $stationLongitude;
        $station['coordinates_approximate'] = false;
        $station['coordinate_note'] = 'Coordinates supplied by the monitoring CSV.';
        $station['coordinate_status'] = 'CSV coordinate';
        $station['coordinate_source'] = 'LLDA monitoring CSV';
    }

    if (!isset($station['observations'][$date])) $station['observations'][$date] = [];
    foreach ($definitions as $key => $definition) {
        $value = numericValue($record[$definition['column']] ?? '');
        if ($value === null) continue;
        $station['observations'][$date][$key] = $value;
        $parameterCounts[$key]++;
    }
    $dates[$date] = true;
    $rowCount++;
    unset($station);
}
fclose($handle);

ksort($dates);
foreach ($stations as &$station) {
    ksort($station['observations']);
    $station['source_urls'] = array_values($station['source_urls']);
    if ($station['source_url'] === null && $station['source_urls']) $station['source_url'] = $station['source_urls'][0];
}
unset($station);
$updatedStationCount = count(array_intersect(array_keys($stations), array_keys($coordinateUpdateIds)));
$fallbackStationCount = max(0, count($stations) - $updatedStationCount);

$parameters = [];
foreach ($definitions as $key => $definition) {
    if ($parameterCounts[$key] === 0) continue;
    $parameters[$key] = [
        'name' => $definition['name'],
        'unit' => $definition['unit'],
        'description' => $definition['description'],
        'available_values' => $parameterCounts[$key],
    ];
}

echo json_encode([
    'ok' => true,
    'simulated' => false,
    'partial' => true,
    'label' => 'LLDA CSV · partial monitoring dataset',
    'dataset_label' => 'LLDA_2020_2025_combined_partial.csv',
    'source_file' => 'csv/LLDA_2020_2025_combined_partial.csv',
    'coordinate_source_file' => 'csv/LLDA_2020Q4_estimated_station_coordinates.csv',
    'coordinate_rows_loaded' => $coordinateRows,
    'coordinate_station_count' => $updatedStationCount,
    'coordinate_fallback_station_count' => $fallbackStationCount,
    'provenance' => 'Parsed from the local CSV. Source URLs and source-type labels are retained per station. Verify secondary reproductions against the official report before operational use.',
    'coordinate_policy' => 'The monitoring CSV has empty latitude/longitude fields. Matching station IDs use the supplied LLDA Q4 2020 estimated-coordinate file; unmatched IDs use fallback named-area anchors. All remain approximate because the coordinate update is not official GPS.',
    'row_count' => $rowCount,
    'skipped_rows' => $skippedRows,
    'parameters' => $parameters,
    'dates' => array_keys($dates),
    'stations' => array_values($stations),
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
