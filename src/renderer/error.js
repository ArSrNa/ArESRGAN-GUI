import './App.css';
import { Typography } from 'antd';
const { Title } = Typography;

export default function Error() {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '60vh',
            flexDirection: 'column'
        }} direction='vertical'>
            <img src={require('./images/error.png')} style={{ width: 100, margin: 10 }}></img>
            <Title>前面的区域，以后再来探索吧？</Title>
            {/* <div className='lead'>页面错误，请确认访问地址是否正确；禁止访问。</div> */}
            <div className='lead'>正在建设中，敬请期待！</div>
        </div>
    )
}