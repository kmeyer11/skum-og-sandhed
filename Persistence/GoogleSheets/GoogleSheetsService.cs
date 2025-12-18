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

        public GoogleSheetsService(string spreadsheetId, string clientSecretPath)
        {
            _spreadsheetId = spreadsheetId;

            GoogleCredential credential;
            using var stream = new FileStream(clientSecretPath, FileMode.Open, FileAccess.Read);
            credential = GoogleCredential.FromStream(stream)
                .CreateScoped(SheetsService.Scope.SpreadsheetsReadonly);

            _service = new SheetsService(new BaseClientService.Initializer
            {
                HttpClientInitializer = credential,
                ApplicationName = "SkumOgSandhed"
            });
        }

        public async Task<IList<IList<object>>> GetRangeAsync(string range)
        {
            var request = _service.Spreadsheets.Values.Get(_spreadsheetId, range);
            var response = await request.ExecuteAsync();
            return response.Values ?? new List<IList<object>>();
        }
    }
}