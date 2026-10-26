import { createApplication } from './app';

const app = createApplication();
const production = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT) || 3000;
const server = app.listen(port, process.env.HOST || (production ? '0.0.0.0' : '127.0.0.1'), () => {
  console.log('8085 simulator ready on port ' + port);
});
server.requestTimeout = 90000;
server.headersTimeout = 15000;
const shutdown = () => {
  server.close(() => process.exit(0));
  setTimeout(() => { server.closeAllConnections(); process.exit(0); }, 8000).unref();
};
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
