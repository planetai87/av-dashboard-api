# Node.js 18 버전을 기반으로 합니다.
FROM node:18-alpine

# 작업 디렉토리를 설정합니다.
WORKDIR /usr/src/app

# package.json과 package-lock.json 파일을 복사합니다.
COPY package*.json ./

# 의존성을 설치합니다.
RUN npm install

# 프로젝트의 모든 파일을 복사합니다.
COPY . .

# 3000번 포트를 노출시킵니다.
EXPOSE 3000

# 서버를 실행합니다.
CMD [ "node", "server.js" ]