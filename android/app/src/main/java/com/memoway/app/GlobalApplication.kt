
package com.memoway.app

import android.app.Application
import com.kakao.sdk.common.KakaoSdk

class GlobalApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        KakaoSdk.init(this, "972181125f7cd0fb9dbd9442fdde314e")
    }
}
