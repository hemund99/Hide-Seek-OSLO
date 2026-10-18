import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'OSLO / Hide + Seek',description:'Your shared field companion for hide-and-seek on Oslo’s T-bane.',manifest:'/manifest.webmanifest',appleWebApp:{capable:true,title:'OSLO H+S',statusBarStyle:'default'},icons:{icon:'/favicon.svg',apple:'/app-icon-192.png'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
