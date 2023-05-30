/* ------------------------------------------------------------------
 * 参考 node-wav-player & sound-play
 * ---------------------------------------------------------------- */
import { ChildProcess, spawn } from 'child_process';
import { EventEmitter } from 'events';
import { logger } from '@/utils/logger';

// 限制播放 4s
const LIMIT_TIME = 4;

const getWinPlayer = (path: string) => {
  // 播放全部的注释，暂时不要删除
  // const stopAudio = 'Start-Sleep -s $player.NaturalDuration.TimeSpan.TotalSeconds;Exit;';

  return `Add-Type -AssemblyName presentationCore; $player = New-Object system.windows.media.mediaplayer; $player.Open('${path}'); $player.Play(); Start-Sleep ${LIMIT_TIME}; Exit;`;
};

export class AudioPlayer extends EventEmitter {
  private childProcess: null | ChildProcess = null;

  private timer: null | NodeJS.Timeout = null;

  public play(path: string) {
    this.shellPlay(path);
  }

  public playLimitTime(path: string, limitTimeMS = LIMIT_TIME * 1000) {
    this.shellPlay(path);

    // 限制只播放多少秒
    if (limitTimeMS) {
      this.timer = setTimeout(() => {
        this.stop();
      }, limitTimeMS);
    }
  }

  public playLoop(path: string, loop = true) {
    this.shellPlay(path, loop);
  }

  public stop() {
    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.childProcess?.kill();
    this.emit('stop');
  }

  private shellPlay(path: string, loop = false) {
    // 如果正在播放则结束
    if (this.childProcess) {
      this.stop();
    }

    if (process.env.IS_WINDOWS) {
      this.childProcess = spawn('powershell', ['-c', `${getWinPlayer(path)}`]);
    } else if (process.env.IS_MAC) {
      this.childProcess = spawn('afplay', [path]);
    } else if (process.env.IS_LINUX) {
      this.childProcess = spawn('aplay', [path]);
    } else {
      logger.error('[audio player]: platform has not player');

      return;
    }

    this.childProcess.on('error', (err) => {
      logger.error('[audio player]: childProcess on error, ', err);
    });

    this.childProcess.on('close', (code) => {
      if (code === 0 && loop) {
        this.shellPlay(path, loop);
      }

      this.emit('close', code);
    });
  }
}

const audioPlayer = new AudioPlayer();

export default audioPlayer;
