package com.growhouse;

import android.app.Application;
import android.content.Context;

import com.facebook.react.PackageList;
import com.facebook.react.ReactApplication;
import com.polidea.reactnativeble.BlePackage;
import com.reactnativecommunity.asyncstorage.AsyncStoragePackage;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.soloader.SoLoader;

import java.lang.reflect.InvocationTargetException;
import java.util.*;

import com.reactnativenavigation.NavigationApplication;
import com.reactnativenavigation.react.NavigationReactNativeHost;
import com.reactnativenavigation.react.ReactGateway;


import com.avishayil.rnrestart.ReactNativeRestartPackage;
import com.masteratul.exceptionhandler.ReactNativeExceptionHandlerPackage;
import com.polidea.reactnativeble.BlePackage;
import com.reactnativecommunity.webview.RNCWebViewPackage;
import com.oblador.vectoricons.VectorIconsPackage;
import co.apptailor.googlesignin.RNGoogleSigninPackage;
import com.reactnativecommunity.netinfo.NetInfoPackage;
import com.amazonaws.RNAWSCognitoPackage;
import com.learnium.RNDeviceInfo.RNDeviceInfo;

public class MainApplication extends NavigationApplication {

    @Override
    protected ReactGateway createReactGateway() {
        ReactNativeHost host = new NavigationReactNativeHost(this, isDebug(), createAdditionalReactPackages()) {
            @Override
            protected String getJSMainModuleName() {
                return "index";
            }
        };
        return new ReactGateway(this, isDebug(), host);
    }

    @Override
    public boolean isDebug() {
        return BuildConfig.DEBUG;
    }

    protected List<ReactPackage> getPackages() {
        // Add additional packages you require here
        // No need to add RnnPackage and MainReactPackage
        return Arrays.<ReactPackage>asList(
                new VectorIconsPackage(),
                new RNGoogleSigninPackage(),
                new ReactNativeExceptionHandlerPackage(),
                new BlePackage(),
                new ReactNativeRestartPackage(),
                new RNCWebViewPackage(),
                new NetInfoPackage(),
                new RNAWSCognitoPackage(),
		new RNDeviceInfo()



        );
    }

    @Override
    public List<ReactPackage> createAdditionalReactPackages() {
        return getPackages();
    }
}
