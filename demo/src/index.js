import React, {Component} from 'react'
import {render} from 'react-dom'
import './style.css';

import Example from '../../src'

class Demo extends Component {
  render() {
    return <div>
      <h1>c Demo</h1>
      <Example/>
    </div>
  }
}

render(<Demo/>, document.querySelector('#demo'));
