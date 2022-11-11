/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2020 Metrological
 *
 * Licensed under the Apache License, Version 2.0 (the License);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { Log } from '../LightningSdkPlugins'
export default class SubtitlesParser {
  // @ params url: subtitle file URL
  // @return parsed subtitles as list of objects
  // also stores parsed data
  // static _removeSubtitleTextStyles
  static fetchAndParseSubs(url, customParser = false, parseOptions = {}) {
    const _url = new URL(url)
    if (!((_url.protocol === 'https:' || _url.protocol === 'http:') && _url.hostname)) {
      Log.info('Invalid subtitle Url')
      return Promise.reject(new Error('Invalid URL'))
    }
    if (parseOptions && 'removeSubtitleTextStyles' in parseOptions) {
      this._removeSubtitleTextStyles = parseOptions.removeSubtitleTextStyles
    }
    return new Promise((resolve, reject) => {
      fetch(url)
        .then(data => {
          let subtitleData = data.text()
          this.clearAllSubtitles()
          if (customParser && typeof customParser === 'function') {
            this._captions = customParser(subtitleData)
          } else {
            this._captions = this.parseSubtitles(subtitleData)
          }
          if (this._captions && this._captions.length) {
            resolve(this._captions)
          } else {
            reject('Failed to parse subtitles: invalid subtitles length')
          }
        })
        .catch(error => {
          Log.error('Fetching file Failed:', error)
          this.clearAllSubtitles()
          reject('Fetching file Failed')
        })
    })
  }

  // clears stored subtitles data
  static clearAllSubtitles() {
    this._captions = null
  }

  static getSubtitleByTimeIndex(currentTime) {
    if (!Array.isArray(this._captions) || this._captions.length <= 0) {
      throw new Error("didn't find and stored captions in plugin")
    }

    if (currentTime === undefined || typeof currentTime !== 'number') {
      throw new Error('You should pass a currentTime to fetch the current subtitle')
    }

    if (this._lastIndex > this._captions.length - 1 || !this._lastIndex) {
      this._lastIndex = 0
    }
    const activeIndex = this.getActiveIndex(currentTime) // find active cue from the captions stored

    if (activeIndex !== -1 && activeIndex <= this._captions.length - 1) {
      return this._captions[activeIndex].payload
    } else if (activeIndex === -1) {
      return ''
    }
  }

  static getActiveIndex(currentTime) {
    let _activeIndex = this._captions
      .slice(this._lastIndex)
      .findIndex(cue => currentTime >= cue.start && currentTime < cue.end)
    if (_activeIndex !== -1) {
      return _activeIndex + this._lastIndex
    } else {
      return this._captions
        .slice(0, this._lastIndex)
        .findIndex(cue => currentTime >= cue.start && currentTime < cue.end)
    }
  }

  // parses subtitle file and returns list of time, text objects
  static parseSubtitles(plainSub, parseOptions = {}) {
    if (parseOptions && 'removeSubtitleTextStyles' in parseOptions) {
      this._removeSubtitleTextStyles = parseOptions.removeSubtitleTextStyles
    }
    let linesArray = plainSub
      .trim()
      .replace('\r\n', '\n')
      .split(/[\r\n]/)
      .map(line => {
        return line.trim()
      })
    let cues = []
    let start = null
    let end = null
    let payload = ''
    let lines = linesArray.filter(item => item !== '' && isNaN(item))
    // linesArray = []
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].indexOf('-->') >= 0) {
        let splitted = lines[i].split(/[ \t]+-->[ \t]+/)

        start = SubtitlesParser.parseTimeStamp(splitted[0])
        end = SubtitlesParser.parseTimeStamp(splitted[1])
      } else if (lines[i] !== '') {
        if (start && end) {
          if (i + 1 < lines.length && lines[i + 1].indexOf('-->') >= 0) {
            let subPayload = payload ? payload + ' ' + lines[i] : lines[i]
            let cue = {
              start,
              end,
              payload: subPayload
                ? this._removeSubtitleTextStyles
                  ? subPayload.replace(/<(.*?)>/g, '') // Remove <v- >, etc tags in subtitle text
                  : subPayload
                : '',
            }
            cues.push(cue)
            start = null
            end = null
            payload = ''
            subPayload = null
          } else {
            payload = payload ? payload + ' ' + lines[i] : lines[i]
          }
        }
      } else if (start && end) {
        if (payload == null) {
          payload = lines[i]
        } else {
          payload += ' ' + lines[i]
        }
      }
    }
    if (start && end) {
      let match = /<(.*?)>/g
      if (payload) {
        payload.replace(match, '')
      }
      let cue = {
        start,
        end,
        payload: payload
          ? this._removeSubtitleTextStyles
            ? payload.replace(/<(.*?)>/g, '') // Remove <v- >, etc tags in subtitle text
            : payload
          : '',
      }
      cues.push(cue)
    }
    return cues
  }

  // parses timestamp in subtitle file into seconds
  static parseTimeStamp(s) {
    const match = s.match(/^(?:([0-9]+):)?([0-5][0-9]):([0-5][0-9](?:[.,][0-9]{0,3})?)/)
    const hours = parseInt(match[1], 10) || '0'
    const minutes = parseInt(match[2], 10)
    const seconds = parseFloat(match[3].replace(',', '.'))
    return seconds + 60 * minutes + 60 * 60 * hours
  }
}
