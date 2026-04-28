把你的音频素材放在这个目录，并使用下面这些文件名替换占位路径：

- `home-bgm.wav` / `home-bgm.m4a` / `home-bgm.mp3`：开始页面背景音乐，优先使用 wav
- `bgm-1.wav` / `bgm-1.m4a` / `bgm-1.mp3`：游戏内普通 BGM 第 1 首，优先使用 wav
- `bgm-2.wav` / `bgm-2.m4a` / `bgm-2.mp3`：游戏内普通 BGM 第 2 首，按顺序播放
- `bgm-3.wav` / `bgm-3.m4a` / `bgm-3.mp3`：游戏内普通 BGM 第 3 首，按顺序播放
- `bgm-4.wav` / `bgm-4.m4a` / `bgm-4.mp3`：游戏内普通 BGM 第 4 首，按顺序播放
- `bgm-5.wav` 到 `bgm-10.wav`，或对应 `.m4a` / `.mp3`：后续普通 BGM，按数字顺序播放；第 10 首结束后回到第 1 首
- `hao-bgm.wav` / `hao-bgm.m4a` / `hao-bgm.mp3`：自在极意豪形态专属背景音乐，进入形态时暂停普通 BGM，形态结束后恢复普通 BGM；下次进入会从上次专属 BGM 播放位置继续
- `attack.wav`：玩家自动攻击时播放，当前已生成一版
- `hit.wav`：玩家子弹命中敌人时播放，当前已生成一版，音量比攻击音效略大

普通 BGM 不再按怪物切换，只按数字顺序播放。自在极意豪形态会临时打断普通 BGM。

建议使用标准命名，例如 `bgm-2.wav`。当前代码也临时兼容了 `bgm-2..wav`。
