using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Services;
using Google.Apis.Sheets.v4;

namespace SkumOgSandhed.Persistence.GoogleSheets
{
    public class GoogleSheetsService
    {
        private readonly SheetsService _service;
        private readonly string _spreadsheetId;

        public GoogleSheetsService(string spreadSheetId)
        {
            GoogleCredential credential = GoogleCredential
                .GetApplicationDefault()
                .CreateScoped(SheetsService.Scope.SpreadsheetsReadonly);

            _service = new SheetsService(new BaseClientService.Initializer
            {
                HttpClientInitializer = credential,
                ApplicationName = "SkumOgSandhed"
            });

            _spreadsheetId = spreadSheetId;
        }

        public string SpreadsheetId { get; }

        public async Task<IList<IList<object>>> GetRangeAsync(string range)
        {
            var request = _service.Spreadsheets.Values.Get(_spreadsheetId, range);
            var response = await request.ExecuteAsync();
            return response.Values ?? new List<IList<object>>();
        }
    }
}