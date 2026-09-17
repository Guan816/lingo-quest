/**
 * http 回退提示条。
 *
 * 什么时候会出现：手机浏览器现在默认「优先 HTTPS」，会把
 * `http://106.14.70.32` 自动升级成 https。而服务器只开了 80 端口，
 * 于是页面可能勉强打开，但所有接口请求都被当成混合内容拦掉，
 * 表现为「点了没反应 / 一直报错」。
 *
 * 只要接口和页面同 host，就可以直接切回 http 恢复。
 * 做成手动按钮而不是自动跳转，免得两个方向来回重定向。
 */
import { useEffect, useState } from 'react';
import { ShieldAlert, ArrowRight } from 'lucide-react';
import { canFallbackToHttp, fallbackToHttp } from '../lib/api';

export function HttpFallbackBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(canFallbackToHttp());
  }, []);

  if (!show) return null;

  return (
    <div className="mx-auto w-full max-w-lg px-4 pt-3">
      <div className="flex items-start gap-2.5 rounded-2xl bg-sun-50 px-3.5 py-3">
        <ShieldAlert size={17} className="mt-0.5 shrink-0 text-sun-600" strokeWidth={2.6} />
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-black text-sun-700">
            浏览器把地址升级成了 https，但服务器只支持 http
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-sun-700/85">
            所以登录、注册这些联网功能都会被拦掉。点下面按钮切回 http 即可。
          </p>
          <button
            onClick={fallbackToHttp}
            className="mt-2 inline-flex items-center gap-1 rounded-xl bg-sun-500 px-3 py-1.5 text-[12px] font-black text-white"
          >
            切回 http 打开
            <ArrowRight size={13} strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  );
}
