package com.example.coinflip;

import androidx.annotation.RequiresApi;
import androidx.appcompat.app.AppCompatActivity;

import android.content.Intent;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.Bundle;

import android.app.Dialog;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;
import java.util.Objects;



public class MainActivity2 extends AppCompatActivity {

    Dialog dialog;

    // Play music after scratch
    public MediaPlayer musicPlay;

    @RequiresApi(api = Build.VERSION_CODES.KITKAT)
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main2);


        // load music
        musicPlay = MediaPlayer.create(this, R.raw.drum_rool);

        Intent intent = getIntent();
        String tossOutcome = intent.getStringExtra("tossOutcome");

        dialog = new Dialog(this);

        com.example.coinflip.ScratchView scratchView = findViewById(R.id.scratchView);
        ImageView img = findViewById(R.id.imgCoin2);

        TextView txtViewOutcome2 = findViewById(R.id.txtViewOutcome2);

        if(tossOutcome.equals("head")){
            img.setImageResource(R.drawable.head);
            txtViewOutcome2.setText("Bharat");

        } else {
            img.setImageResource(R.drawable.tail);
            txtViewOutcome2.setText("Paisa");

        }

        Toast.makeText(MainActivity2.this, "Scratch the card to see!", Toast.LENGTH_SHORT).show();


        scratchView.setRevealListener(new com.example.coinflip.ScratchView.IRevealListener() {

            @Override
            public void onRevealed(com.example.coinflip.ScratchView scratchView) {


                final Handler handler = new Handler(Looper.getMainLooper());

                // Delay the popup
                handler.postDelayed(new Runnable() {
                    @Override
                    public void run() {

                        // start music
                        musicPlay.start();

                        // start new dialog
                        dialog.setContentView(R.layout.popup_dialog);
                        Objects.requireNonNull(dialog.getWindow()).setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
                        dialog.show();

                    }
                }, 1500);

                handler.postDelayed(new Runnable() {
                    public void run() {
//                        dialog.dismiss();  // don't dismiss just go to main activity
                        Intent myIntent = new Intent(MainActivity2.this, MainActivity.class);
                        startActivity(myIntent);

                    }
                }, 8000); // 8000 milliseconds delay

            }

            @Override
            public void onRevealPercentChangedListener(com.example.coinflip.ScratchView scratchView, float percent) {
//                Log.d("Revealed", String.valueOf(percent));
            }
        });


    }
}
