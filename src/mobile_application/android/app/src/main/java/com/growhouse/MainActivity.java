package com.growhouse;

import com.facebook.react.ReactActivity;
import com.reactnativenavigation.NavigationActivity;
// import com.reactnativenavigation.controllers.SplashActivity;
import android.widget.LinearLayout;
import android.widget.LinearLayout.LayoutParams;
import android.graphics.Color;
import android.widget.ImageView;
import android.view.Gravity;
import android.util.TypedValue;

public class MainActivity extends NavigationActivity {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  // @Override
  // protected String getMainComponentName() {
  //   return "GrowHouse";
  // }

@Override
    public void addDefaultSplashLayout() {
        
        // LinearLayout view = new LinearLayout(this);
        // TextView textView = new TextView(this);

        // view.setBackgroundColor(Color.parseColor("#607D8B"));
        // view.setGravity(Gravity.CENTER);

        // textView.setTextColor(Color.parseColor("#FFFFFF"));
        // textView.setText("React Native Navigation");
        // textView.setGravity(Gravity.CENTER);
        // textView.setTextSize(TypedValue.COMPLEX_UNIT_DIP, 40);

        // view.addView(textView);
        // return view;

        LinearLayout mainLayout = new LinearLayout(this);
        mainLayout.setOrientation(LinearLayout.VERTICAL);

        LayoutParams mainLayoutParams = new LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT);
        mainLayout.setLayoutParams(mainLayoutParams);
        mainLayout.setPadding(0,0,0,25);
        mainLayout.setBackgroundColor(Color.parseColor("#FFBA00"));

        LinearLayout linearLayout = new LinearLayout(this);
        linearLayout.setOrientation(LinearLayout.VERTICAL);
        linearLayout.setLayoutParams(new LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT));
        linearLayout.setBackgroundColor(Color.parseColor("#FFFFFF"));

        ImageView imageView = new ImageView(this);
        imageView.setImageResource(R.drawable.growhouse);
        LayoutParams imageParams = new LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT);
        imageParams.setMargins(50,50,50,50);
        imageView.setLayoutParams(imageParams);
        linearLayout.addView(imageView);
        linearLayout.setGravity(Gravity.CENTER);
        
        mainLayout.addView(linearLayout);
         setContentView(mainLayout);
    }

}
