package com.example.coinflip;

import android.content.Intent;
import android.media.MediaPlayer;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.animation.AccelerateInterpolator;
import android.view.animation.AlphaAnimation;
import android.view.animation.Animation;
import android.view.animation.DecelerateInterpolator;
import android.widget.Button;
import android.widget.ImageView;

import androidx.appcompat.app.AppCompatActivity;

import java.util.Random;



public class MainActivity extends AppCompatActivity {

    public static final Random RANDOM = new Random();
    private ImageView imgCoin;
    public MediaPlayer musicToss;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        imgCoin = findViewById(R.id.imgCoin);
        Button btnToss = findViewById(R.id.btnToss);

        musicToss = MediaPlayer.create(this, R.raw.coinflip);



        btnToss.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                flipAnimationCoin();
                String tossOutcome = flipCoin();
                Intent myIntent = new Intent(MainActivity.this, MainActivity2.class);

                myIntent.putExtra("tossOutcome", tossOutcome);

                final Handler handler = new Handler(Looper.getMainLooper());
                handler.postDelayed(new Runnable() {
                    @Override
                    public void run() {
                        startActivity(myIntent);
                        finish();
                    }
                }, 1500);

            }
        });
    }

    private String flipCoin(){
        int chance = RANDOM.nextInt(2);
        if (chance == 1 ){
            return "tail";
        } else {
            return "head";
        }
    }

    private void flipAnimationCoin() {

        Animation fadeOut = new AlphaAnimation(1, 0);
        fadeOut.setInterpolator(new AccelerateInterpolator());
        fadeOut.setDuration(1000);
        fadeOut.setFillAfter(true);
//        coin.startAnimation(fadeOut);
        imgCoin.setImageResource(R.drawable.tail);


        fadeOut.setAnimationListener(new Animation.AnimationListener() {
            @Override
            public void onAnimationStart(Animation animation) {
                musicToss.start();
            }

            @Override
            public void onAnimationEnd(Animation animation) {
                Animation fadeIn = new AlphaAnimation(0, 1);
                fadeIn.setInterpolator(new DecelerateInterpolator());
                fadeIn.setDuration(1000);
                fadeIn.setFillAfter(true);
                imgCoin.startAnimation(fadeIn);
                imgCoin.setImageResource(R.drawable.head);

            }

            @Override
            public void onAnimationRepeat(Animation animation) {
                musicToss.stop();
            }
        });

        imgCoin.startAnimation(fadeOut);
    }

}