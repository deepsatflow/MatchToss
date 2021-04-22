package com.example.coinflip;

import androidx.annotation.RequiresApi;
import androidx.appcompat.app.AppCompatActivity;

import android.content.Intent;
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
    @RequiresApi(api = Build.VERSION_CODES.KITKAT)
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main2);

        Intent intent = getIntent();
        String tossOutcome = intent.getStringExtra("tossOutcome");

        dialog = new Dialog(this);

        ScratchView scratchView = findViewById(R.id.scratchView);
        ImageView img = findViewById(R.id.imgCoin2);

        TextView txtViewOutcome2 = findViewById(R.id.txtViewOutcome2);

        if(tossOutcome.equals("head")){
            img.setImageResource(R.drawable.head);
            txtViewOutcome2.setText("Bharat");
            System.out.println("Head");

        } else {
            img.setImageResource(R.drawable.tail);
            txtViewOutcome2.setText("Paisa");
            System.out.println("Tail");
        }

        scratchView.setRevealListener(new ScratchView.IRevealListener() {
            @Override
            public void onRevealed(ScratchView scratchView) {
                Toast.makeText(MainActivity2.this, "Revealed!", Toast.LENGTH_LONG).show();

                final Handler handler = new Handler(Looper.getMainLooper());
                handler.postDelayed(new Runnable() {
                    @Override
                    public void run() {
                        dialog.setContentView(R.layout.popup_dialog);
                        Objects.requireNonNull(dialog.getWindow()).setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
                        dialog.show();
                    }
                }, 7000);

            }

            @Override
            public void onRevealPercentChangedListener(ScratchView scratchView, float percent) {
                Log.d("Revealed", String.valueOf(percent));
            }
        });
    }
}
