class ProgressRepository {
  read() {
    throw new Error('ProgressRepository.read() not implemented');
  }

  write() {
    throw new Error('ProgressRepository.write() not implemented');
  }
}

class LocalProgressRepository extends ProgressRepository {
  constructor(options = {}) {
    super();
    const {
      filePath,
      fs,
      logger,
      messages,
      tempFilePath,
    } = options;

    if (!filePath) {
      throw new Error('LocalProgressRepository requires a filePath');
    }

    this.filePath = filePath;
    this.tempFilePath = tempFilePath || `${filePath}.tmp`;
    this.fs = fs || require('fs');
    this.logger = logger || console;
    this.messages = {
      readError: 'Error reading progress.json:',
      writeError: 'Error writing progress.json:',
      ...messages,
    };
  }

  read() {
    try {
      if (this.fs.existsSync(this.filePath)) {
        const payload = this.fs.readFileSync(this.filePath);
        return JSON.parse(payload);
      }
    } catch (error) {
      this.logger.error(this.messages.readError, error);
    }
    return {};
  }

  write(data) {
    let payload = null;
    try {
      payload = JSON.stringify(data, null, 2);
    } catch (error) {
      this.logger.error(this.messages.writeError, error);
      return;
    }
    const tempPath = this.tempFilePath;
    const canRename = tempPath && typeof this.fs.renameSync === 'function';

    if (canRename) {
      try {
        this.fs.writeFileSync(tempPath, payload);
        this.fs.renameSync(tempPath, this.filePath);
        return;
      } catch (error) {
        // Fall back to direct write below.
      } finally {
        if (typeof this.fs.unlinkSync === 'function') {
          try {
            if (tempPath && this.fs.existsSync(tempPath)) {
              this.fs.unlinkSync(tempPath);
            }
          } catch (cleanupError) {
            // Ignore cleanup errors.
          }
        }
      }
    }

    try {
      this.fs.writeFileSync(this.filePath, payload);
    } catch (error) {
      this.logger.error(this.messages.writeError, error);
    }
  }
}

module.exports = {
  ProgressRepository,
  LocalProgressRepository,
};
