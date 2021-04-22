package com.example.coinflip;

import androidx.appcompat.app.AppCompatActivity;

import android.app.Activity;
import android.content.Intent;

import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
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
import android.widget.TextView;
import android.app.Dialog;

import java.util.Objects;
import java.util.Random;



public class MainActivity extends AppCompatActivity {

    public static final Random RANDOM = new Random();
    private ImageView coin;
    private Button btn;
    private TextView show;
    public MediaPlayer musicToss;

    @Override
    protected void onCreate(Bundle savedInstanceState, Activity activity) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        coin = findViewById(R.id.imgCoin);
        btn =  findViewById(R.id.btnToss);

        musicToss = MediaPlayer.create(this, R.raw.coinflip);



        btn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                flipAnimationCoin();
                String tossOutcome = flipCoin();

                Intent myIntent = new Intent(MainActivity.this, MainActivity2.class);

                System.out.println("toss outcome: " + tossOutcome);
                myIntent.putExtra("tossOutcome", tossOutcome);

                final Handler handler = new Handler(Looper.getMainLooper());
                handler.postDelayed(new Runnable() {
                    @Override
                    public void run() {
                        startActivity(myIntent);
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
        coin.setImageResource(R.drawable.tail);


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
                coin.startAnimation(fadeIn);
                coin.setImageResource(R.drawable.head);

            }

            @Override
            public void onAnimationRepeat(Animation animation) {
                musicToss.stop();
            }
        });

        coin.startAnimation(fadeOut);
    }

}