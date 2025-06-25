const express = require('express');
const path = require('path');
const { google } = require('googleapis');

const app = express();
const port = process.env.PORT || 3000;

// JSON 요청 본문을 파싱하기 위해 미들웨어를 추가합니다.
app.use(express.json());

const SPREADSHEET_ID = '1O5Ir42pvFjlul4Zuz3N13qmyKM0ez8ss_dvdVFveG50'; // Google Sheet 문서 URL에서 ID 부분

// Google 인증 설정
const auth = new google.auth.GoogleAuth({
    // 로컬 테스트 시에는 credentials.json 파일을 사용합니다.
    // keyFile: 'credentials.json',
    // Railway 배포 시에는 환경 변수를 사용합니다.
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS), 
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

async function getSheetsClient() {
    const authClient = await auth.getClient();
    return google.sheets({ version: 'v4', auth: authClient });
}

// 데이터 읽기 API 엔드포인트
app.get('/api/:sheetName', async (req, res) => {
    try {
        const sheetName = req.params.sheetName;
        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: sheetName,
        });

        const rows = response.data.values;
        if (rows && rows.length) {
            const headers = rows[0];
            const data = rows.slice(1).map(row => {
                const rowData = {};
                headers.forEach((header, index) => {
                    rowData[header] = row[index];
                });
                return rowData;
            });
            res.json(data);
        } else {
            res.json([]);
        }
    } catch (error) {
        console.error('Error fetching data from Google Sheets:', error);
        res.status(500).send('Error fetching data from Google Sheets');
    }
});

// 데이터 쓰기 API 엔드포인트 (신규 추가)
app.post('/api/updateTask', async (req, res) => {
    try {
        const { taskId, completed } = req.body;
        const sheets = await getSheetsClient();
        
        // 1. 해당 taskId가 몇 번째 행에 있는지 찾습니다.
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'SetupTasks!A:A', // ID는 A열에 있다고 가정
        });

        const idColumn = response.data.values;
        let rowIndex = -1;
        if (idColumn) {
            rowIndex = idColumn.findIndex(row => row[0] == taskId);
        }

        if (rowIndex === -1) {
            return res.status(404).send('Task ID not found');
        }

        const targetRow = rowIndex + 1; // 실제 시트 행 번호 (1부터 시작)

        // 2. 'completed' 열의 위치를 찾습니다. (G열이라고 가정)
        const targetColumn = 'G'; 

        // 3. 해당 셀의 값을 업데이트합니다.
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `SetupTasks!${targetColumn}${targetRow}`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[completed.toString().toUpperCase()]]
            },
        });

        res.status(200).json({ success: true, message: 'Task updated successfully' });

    } catch (error) {
        console.error('Error updating task status:', error);
        res.status(500).send('Error updating task status');
    }
});

//음향평가 라우터 추가
app.get("/api2/white-bc-values", async (req, res) => {
  try {
    const sheets = google.sheets({ version: "v4", auth });

    const spreadsheetId = "18daZAEoIerMbLZitP7vEH_87_NcvB2vVZQb8Yx0ZSEY";
    const dayMap = {
      "첫째날 정량평가": 1,
      "둘째날 정량평가": 2,
      "셋째날 정량평가": 3,
    };

    const result = [];

    for (const [sheetName, day] of Object.entries(dayMap)) {
      const range = `${sheetName}!B12:P43`;
      const response = await sheets.spreadsheets.get({
        spreadsheetId,
        ranges: [range],
        includeGridData: true,
      });

      const rows = response.data.sheets?.[0]?.data?.[0]?.rowData || [];
      let count = 1;

      for (const row of rows) {
        const values = row.values || [];
        const timeLabel = values[0]?.formattedValue; // B열
        const dCell = values[2]; // D열 배경색 판별 기준

        if (!timeLabel || !dCell) continue;

        const bg = dCell.effectiveFormat?.backgroundColor;
        const r = Math.round((bg?.red ?? 0) * 255);
        const g = Math.round((bg?.green ?? 0) * 255);
        const b = Math.round((bg?.blue ?? 0) * 255);

        const isWhite = r === 255 && g === 255 && b === 255;
        if (!isWhite) continue;

        const time = `${count}차 (${timeLabel})`;
        count++;

        for (let i = 2; i <= 14; i++) {
          const dbCell = values[i];
          const dbVal = parseFloat(dbCell?.formattedValue);
          if (!isNaN(dbVal)) {
            result.push({
              day,
              time,
              seat: String(i - 1), // D열(i=2) → seat: "1"
              db: dbVal,
            });
          }
        }
      }
    }

    console.log(result);
    res.json(result);
  } catch (err) {
    console.error("❌ Error fetching white-bc-values:", err);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

// 프론트엔드 파일 제공
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 작업자 페이지 라우트 추가
app.get('/worker', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'worker.html'));
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
