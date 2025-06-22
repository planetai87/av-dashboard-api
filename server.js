const express = require('express');
const path = require('path');
const { google } = require('googleapis');

const app = express();
const port = process.env.PORT || 3000;

const SPREADSHEET_ID = '1O5Ir42pvFjlul4Zuz3N13qmyKM0ez8ss_dvdVFveG50'; // Google Sheet 문서 URL에서 ID 부분

// Google 인증 설정
const auth = new google.auth.GoogleAuth({
    keyFile: 'credentials.json', // 로컬 테스트용
    // credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS), // Railway 배포용
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// API 엔드포인트 설정
app.get('/api/:sheetName', async (req, res) => {
    try {
        const sheetName = req.params.sheetName;
        const sheets = google.sheets({ version: 'v4', auth });
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: sheetName,
        });

        const rows = response.data.values;
        if (rows.length) {
            const headers = rows[0];
            const data = rows.slice(1).map(row => {
                const rowData = {};
                headers.forEach((header, index) => {
                    rowData[header] = row[index];
                });
                return rowData;
            });
            res.json(data);
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching data from Google Sheets');
    }
});

// 프론트엔드 파일(index.html) 제공
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// public 폴더 생성 및 index.html 이동
// 프로젝트 루트에 public 폴더를 만들고 index.html을 그 안으로 옮겨주세요.
// server.js 코드가 / 경로 요청 시 public/index.html을 제공합니다.

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
